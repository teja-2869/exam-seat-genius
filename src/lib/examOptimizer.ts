// AI Exam Optimization Engine
// Deterministic helpers used by Create Exam, Exam Schedule, Generate Seating, and Seating Plans.
// Pure functions — no Firestore calls inside.

import { normYear, isLabRoom, roomCapacity } from './examUtils';

export type SubjectClass = 'COMMON' | 'CORE' | 'BRANCH' | 'LAB' | 'SUPPLEMENTARY';
export type SeatingRisk = 'LOW' | 'MEDIUM' | 'HIGH';
export type BenchMode = 'ONE_PER_BENCH' | 'TWO_PER_BENCH';

export interface ClassifiedSubject {
  id: string;
  subjectCode: string;
  subjectName: string;
  branch: string;
  year: string;
  semester?: string | number;
  classification: SubjectClass;
  shareCount: number; // # of branches sharing same code
}

const normCode = (c: any) => String(c || '').trim().toUpperCase();
const normName = (n: any) => String(n || '').trim().toLowerCase().replace(/\s+/g, ' ');

/**
 * Classify subjects into COMMON / CORE / BRANCH / LAB / SUPPLEMENTARY.
 * `pool` should include subjects across all branches for accurate share detection.
 */
export function classifySubjects(selected: any[], pool: any[]): ClassifiedSubject[] {
  // share map by code (fallback by name) — counts unique branches that have it.
  const branchesByKey: Record<string, Set<string>> = {};
  pool.forEach(s => {
    const key = normCode(s.subjectCode) || normName(s.subjectName);
    if (!key) return;
    (branchesByKey[key] = branchesByKey[key] || new Set()).add(String(s.branch || ''));
  });

  return selected.map(s => {
    const key = normCode(s.subjectCode) || normName(s.subjectName);
    const shareCount = branchesByKey[key]?.size || 1;
    const name = normName(s.subjectName);
    let classification: SubjectClass;
    if ((s.examType || s.category) === 'Supplementary') classification = 'SUPPLEMENTARY';
    else if (name.includes('lab') || name.includes('practical') || (s.roomTypeHint && String(s.roomTypeHint).toLowerCase() === 'lab')) classification = 'LAB';
    else if (shareCount >= 3) classification = 'COMMON';
    else if (shareCount === 2) classification = 'CORE';
    else classification = 'BRANCH';

    return {
      id: s.id,
      subjectCode: s.subjectCode,
      subjectName: s.subjectName,
      branch: s.branch,
      year: normYear(s.year),
      semester: s.semester,
      classification,
      shareCount,
    };
  });
}

/** Build a per-branch similarity matrix based on shared subject codes. */
export function buildBranchSimilarityMatrix(pool: any[]) {
  const byBranch: Record<string, Set<string>> = {};
  pool.forEach(s => {
    const b = String(s.branch || '');
    if (!b) return;
    const k = normCode(s.subjectCode) || normName(s.subjectName);
    if (!k) return;
    (byBranch[b] = byBranch[b] || new Set()).add(k);
  });
  const branches = Object.keys(byBranch);
  const matrix: Record<string, Record<string, { sharedSubjects: number; sharedCodes: string[]; riskScore: number }>> = {};
  for (const a of branches) {
    matrix[a] = {};
    for (const b of branches) {
      if (a === b) continue;
      const codes: string[] = [];
      byBranch[a].forEach(k => { if (byBranch[b].has(k)) codes.push(k); });
      const minSize = Math.max(1, Math.min(byBranch[a].size, byBranch[b].size));
      matrix[a][b] = {
        sharedSubjects: codes.length,
        sharedCodes: codes,
        riskScore: Number((codes.length / minSize).toFixed(3)),
      };
    }
  }
  return matrix;
}

/** Risk that a subject session will be hard to seat conflict-free. */
export function computeSeatingRisk(
  subject: { classification: SubjectClass },
  studentCount: number,
  totalCapacity: number
): SeatingRisk {
  if (subject.classification === 'COMMON' && studentCount > 150) return 'HIGH';
  if (totalCapacity > 0 && studentCount / totalCapacity > 0.4) return 'HIGH';
  if (subject.classification === 'COMMON' || subject.classification === 'CORE') return 'MEDIUM';
  if (totalCapacity > 0 && studentCount / totalCapacity > 0.2) return 'MEDIUM';
  return 'LOW';
}

export function pickBenchMode(risk: SeatingRisk, isLab: boolean): BenchMode {
  if (isLab) return 'ONE_PER_BENCH';
  return risk === 'HIGH' ? 'ONE_PER_BENCH' : 'TWO_PER_BENCH';
}

/** Total exam-usable capacity across rooms (classrooms + labs). */
export function totalRoomCapacity(rooms: any[]): number {
  return rooms.reduce((a, r) => a + roomCapacity(r), 0);
}

/** Score a schedule 0-100. */
export function scoreSchedule(
  scheduleRows: Array<{ date: string; slot: string; subjectCode: string; branches: string[]; year: string }>,
  similarity: ReturnType<typeof buildBranchSimilarityMatrix> | Record<string, any>
): number {
  if (scheduleRows.length === 0) return 0;
  let score = 100;

  // Penalty: same date+slot hosting same subjectCode for similar branches
  const slotMap: Record<string, typeof scheduleRows> = {};
  scheduleRows.forEach(r => {
    const k = `${r.date}|${r.slot}`;
    (slotMap[k] = slotMap[k] || []).push(r);
  });
  for (const k of Object.keys(slotMap)) {
    const rows = slotMap[k];
    for (let i = 0; i < rows.length; i++) {
      for (let j = i + 1; j < rows.length; j++) {
        if (normCode(rows[i].subjectCode) === normCode(rows[j].subjectCode)) score -= 8;
        for (const ba of rows[i].branches) {
          for (const bb of rows[j].branches) {
            const r = similarity?.[ba]?.[bb]?.riskScore || 0;
            if (r > 0.5 && rows[i].year === rows[j].year) score -= 3;
          }
        }
      }
    }
  }

  // Penalty: a cohort having two same-day slots
  const dayCohort: Record<string, number> = {};
  scheduleRows.forEach(r => {
    r.branches.forEach(b => {
      const k = `${r.date}|${b}|${r.year}`;
      dayCohort[k] = (dayCohort[k] || 0) + 1;
    });
  });
  Object.values(dayCohort).forEach(c => { if (c > 1) score -= (c - 1) * 4; });

  return Math.max(0, Math.min(100, Math.round(score)));
}

/** Detect adjacency / duplication conflicts in a flat seats array. */
export function detectConflicts(seats: any[]): Array<{
  type: 'adjacent' | 'frontback' | 'diagonal' | 'duplicate';
  row: number;
  col: number;
  rollA: string;
  rollB: string;
  subject: string;
}> {
  const grid: Record<string, any> = {};
  seats.forEach(s => {
    const key = `${s.row}|${s.column}|${s.seatPosition || 'single'}`;
    grid[key] = s;
  });

  const conflicts: any[] = [];
  const seen: Record<string, string> = {};

  // duplicate roll
  seats.forEach(s => {
    if (!s.rollNumber) return;
    if (seen[s.rollNumber]) {
      conflicts.push({ type: 'duplicate', row: s.row, col: s.column, rollA: s.rollNumber, rollB: seen[s.rollNumber], subject: s.subjectCode || '' });
    } else seen[s.rollNumber] = `R${s.row}C${s.column}`;
  });

  const sameSubject = (a: any, b: any) =>
    a && b && a.subjectCode && b.subjectCode && normCode(a.subjectCode) === normCode(b.subjectCode);

  seats.forEach(s => {
    if (!s.subjectCode) return;
    const r = s.row, c = s.column;
    // bench partner
    const partnerPos = s.seatPosition === 'left' ? 'right' : s.seatPosition === 'right' ? 'left' : null;
    if (partnerPos) {
      const partner = grid[`${r}|${c}|${partnerPos}`];
      if (sameSubject(s, partner) && s.rollNumber < partner.rollNumber) {
        conflicts.push({ type: 'adjacent', row: r, col: c, rollA: s.rollNumber, rollB: partner.rollNumber, subject: s.subjectCode });
      }
    }
    // L/R across benches (same row, c+1)
    ['single', 'left', 'right'].forEach(p => {
      const right = grid[`${r}|${c + 1}|${p}`];
      if (sameSubject(s, right)) {
        conflicts.push({ type: 'adjacent', row: r, col: c, rollA: s.rollNumber, rollB: right.rollNumber, subject: s.subjectCode });
      }
    });
    // front/back
    ['single', 'left', 'right'].forEach(p => {
      const front = grid[`${r + 1}|${c}|${p}`];
      if (sameSubject(s, front) && s.seatPosition === p) {
        conflicts.push({ type: 'frontback', row: r, col: c, rollA: s.rollNumber, rollB: front.rollNumber, subject: s.subjectCode });
      }
    });
    // diagonal
    [[1, 1], [1, -1]].forEach(([dr, dc]) => {
      ['single', 'left', 'right'].forEach(p => {
        const diag = grid[`${r + dr}|${c + dc}|${p}`];
        if (sameSubject(s, diag)) {
          conflicts.push({ type: 'diagonal', row: r, col: c, rollA: s.rollNumber, rollB: diag.rollNumber, subject: s.subjectCode });
        }
      });
    });
  });

  return conflicts;
}

/** Score 0-100 for a seating room. */
export function scoreSeating(seats: any[], totalSeats: number): number {
  if (seats.length === 0) return 0;
  const conflicts = detectConflicts(seats);
  let score = 100;
  score -= conflicts.filter(c => c.type === 'adjacent').length * 6;
  score -= conflicts.filter(c => c.type === 'frontback').length * 4;
  score -= conflicts.filter(c => c.type === 'diagonal').length * 2;
  score -= conflicts.filter(c => c.type === 'duplicate').length * 10;

  // branch diversity bonus/penalty
  const branches = new Set(seats.map(s => s.branch).filter(Boolean));
  if (branches.size <= 1 && seats.length > 6) score -= 5;

  // utilization adjustment — under-utilized rooms score slightly lower
  const util = totalSeats > 0 ? seats.length / totalSeats : 0;
  if (util < 0.3) score -= 5;

  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Allocate students to seats in a single room with subject-aware placement.
 * Returns flat seats array safe for Firestore. Empties allowed (no nulls pushed).
 *
 * `students` is the input pool tagged with `_subject` (object containing subjectCode etc.).
 * After allocation, picked students are removed from the input array.
 */
export function allocateRoomSeats(
  room: any,
  students: any[],
  opts: { mode: BenchMode; checkerboard: boolean }
): any[] {
  const lab = isLabRoom(room.roomType);
  const rowsCount = parseInt(room.rowsOfBenches ?? room.rows, 10) || 5;
  const colsCount = parseInt(room.columnsOfBenches ?? room.columns, 10) || 5;
  const seats: any[] = [];

  // Bucket students by subjectCode so we can interleave.
  const buckets: Record<string, any[]> = {};
  students.forEach(s => {
    const k = normCode(s._subject?.subjectCode) || 'UNKNOWN';
    (buckets[k] = buckets[k] || []).push(s);
  });
  // sort each bucket by branch+roll (deterministic)
  Object.values(buckets).forEach(arr =>
    arr.sort((a, b) => String(a.branch).localeCompare(String(b.branch)) || String(a.rollNumber).localeCompare(String(b.rollNumber)))
  );
  // Largest-bucket-first round robin order keys, recomputed each pick
  const pickNext = (avoidSubject?: string, avoidBranch?: string): any | null => {
    const keys = Object.keys(buckets).filter(k => buckets[k].length > 0);
    if (keys.length === 0) return null;
    keys.sort((a, b) => buckets[b].length - buckets[a].length);
    // Try to avoid same-subject neighbor first
    let chosenKey = keys.find(k => k !== avoidSubject) || keys[0];
    // If we can also avoid same branch, prefer that
    if (avoidBranch) {
      const bucket = buckets[chosenKey];
      const idx = bucket.findIndex(s => s.branch !== avoidBranch);
      if (idx > 0) {
        const [picked] = bucket.splice(idx, 1);
        return picked;
      }
    }
    return buckets[chosenKey].shift() || null;
  };

  const pushSeat = (s: any, r: number, c: number, pos: 'left' | 'right' | 'single') => {
    if (!s) return;
    seats.push({
      row: r + 1,
      column: c + 1,
      bench: c + 1,
      seatPosition: pos,
      studentId: s.id,
      rollNumber: String(s.rollNumber || ''),
      name: s.name || '',
      branch: s.branch || '',
      year: normYear(s.year),
      subjectCode: s._subject?.subjectCode || '',
      subjectName: s._subject?.subjectName || '',
      scheduleId: s._subject?.id || '',
    });
  };

  const findLeftNeighbor = (r: number, c: number, pos: string) => {
    if (c === 0) return null;
    return seats.find(x => x.row === r + 1 && x.column === c && x.seatPosition === pos);
  };
  const findAbove = (r: number, c: number, pos: string) => {
    if (r === 0) return null;
    return seats.find(x => x.row === r && x.column === c + 1 && x.seatPosition === pos);
  };

  for (let r = 0; r < rowsCount; r++) {
    for (let c = 0; c < colsCount; c++) {
      // Checkerboard for COMMON/HIGH-risk: leave alternating cells empty
      if (opts.checkerboard && (r + c) % 2 === 1) continue;

      if (lab) {
        // labs: 1 per cell, mode is fixed by `pickBenchMode`
        const above = findAbove(r, c, 'single');
        const left = findLeftNeighbor(r, c, 'single');
        const s = pickNext(above?.subjectCode || left?.subjectCode, above?.branch || left?.branch);
        pushSeat(s, r, c, 'single');
        continue;
      }

      if (opts.mode === 'ONE_PER_BENCH') {
        const above = findAbove(r, c, 'single');
        const left = findLeftNeighbor(r, c, 'single');
        const s = pickNext(above?.subjectCode || left?.subjectCode, above?.branch || left?.branch);
        pushSeat(s, r, c, 'single');
      } else {
        // two per bench
        const above = findAbove(r, c, 'left');
        const left = findLeftNeighbor(r, c, 'right');
        const s1 = pickNext(above?.subjectCode || left?.subjectCode, above?.branch || left?.branch);
        pushSeat(s1, r, c, 'left');
        const aboveR = findAbove(r, c, 'right');
        const s2 = pickNext(s1?._subject?.subjectCode || aboveR?.subjectCode, s1?.branch || aboveR?.branch);
        pushSeat(s2, r, c, 'right');
      }
    }
  }

  // Remove placed students from input array
  const placedIds = new Set(seats.map(s => s.studentId));
  for (let i = students.length - 1; i >= 0; i--) {
    if (placedIds.has(students[i].id)) students.splice(i, 1);
  }
  return seats;
}
