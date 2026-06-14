// Master Subject Catalog helpers.
// New model: subjects have `offeredTo: [{branch, semester, year}]`.
// Legacy docs use `branch/year/semester`; helpers treat them as a single offering.

import { normYear } from './examUtils';

export interface Offering {
  branch: string;
  semester: string;
  year: string;
}

export const semesterToYear = (sem: string | number): string => {
  const n = parseInt(String(sem), 10);
  if (!n) return '';
  if (n <= 2) return '1st';
  if (n <= 4) return '2nd';
  if (n <= 6) return '3rd';
  return '4th';
};

export const normCode = (s: any) => String(s || '').trim().toUpperCase();
export const normName = (s: any) => String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');

/** Return offerings of a subject, supporting both new and legacy shape. */
export function getOfferings(s: any): Offering[] {
  if (Array.isArray(s?.offeredTo) && s.offeredTo.length > 0) {
    return s.offeredTo
      .filter((o: any) => o && o.branch)
      .map((o: any) => ({
        branch: String(o.branch),
        semester: String(o.semester ?? ''),
        year: normYear(o.year || semesterToYear(o.semester)),
      }));
  }
  if (s?.branch) {
    return [{
      branch: String(s.branch),
      semester: String(s.semester ?? ''),
      year: normYear(s.year || semesterToYear(s.semester)),
    }];
  }
  return [];
}

/** Does this subject have an offering for the given branch + semester (and optional year)? */
export function subjectOffers(
  s: any,
  branch?: string,
  semester?: string | number,
  year?: string
): boolean {
  const offs = getOfferings(s);
  if (offs.length === 0) return false;
  return offs.some(o => {
    if (branch && o.branch !== branch) return false;
    if (semester !== undefined && semester !== '' && String(o.semester) !== String(semester)) return false;
    if (year && normYear(o.year) !== normYear(year)) return false;
    return true;
  });
}

/** Branches a subject is offered to (deduped). */
export function offeringBranches(s: any): string[] {
  return Array.from(new Set(getOfferings(s).map(o => o.branch))).filter(Boolean);
}

/** Merge two offering arrays, dedup by branch+semester. */
export function mergeOfferings(a: Offering[], b: Offering[]): Offering[] {
  const map = new Map<string, Offering>();
  [...a, ...b].forEach(o => {
    if (!o.branch) return;
    const k = `${o.branch}|${o.semester}`;
    if (!map.has(k)) map.set(k, { ...o, year: normYear(o.year || semesterToYear(o.semester)) });
  });
  return Array.from(map.values());
}

/** Classify a single subject based on offering footprint. */
export function classifyCategory(
  s: any,
  opts?: { lab?: boolean }
): 'Common Subject' | 'Core Subject' | 'Branch Specific' | 'Lab Subject' | 'Project' | 'Supplementary' {
  const name = normName(s.subjectName);
  if ((s.examType || s.category) === 'Supplementary') return 'Supplementary';
  if (opts?.lab || name.includes('lab') || name.includes('practical') || (s.examType && /lab|practical/i.test(s.examType))) return 'Lab Subject';
  if (name.includes('project')) return 'Project';
  const branches = offeringBranches(s).length;
  if (branches >= 3) return 'Common Subject';
  if (branches === 2) return 'Core Subject';
  return 'Branch Specific';
}

/** True if the subject is offered to 2+ branches → exam-scheduling risk subject. */
export function isCommonSubject(s: any): boolean {
  return offeringBranches(s).length >= 2;
}

/** Key used to dedupe subjects: prefer code, fall back to normalized name. */
export const subjectKey = (s: any): string =>
  normCode(s.subjectCode) || normName(s.subjectName);
