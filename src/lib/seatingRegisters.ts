// Seating Register builders + PDF / Excel exporters.
// Reads from the flat `seats` array stored on each seatingPlans doc.

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

export interface FlatSeat {
  rollNumber: string;
  name?: string;
  branch?: string;
  year?: string;
  subjectCode?: string;
  subjectName?: string;
  row: number;
  column: number;
  bench?: number;
  seatPosition?: string;
}

export interface PlanLike {
  id?: string;
  sessionName?: string;
  examDate: string;
  examSlot: string;
  startTime?: string;
  endTime?: string;
  roomNumber: string;
  blockNumber: string | number;
  floorNumber: string | number;
  roomType?: string;
  totalSeats?: number;
  occupiedSeats?: number;
  seats?: FlatSeat[];
}

const sortRoll = (a: string, b: string) => String(a).localeCompare(String(b), undefined, { numeric: true });

const seatLabel = (s: FlatSeat) => `R${s.row}-C${s.column}${s.seatPosition && s.seatPosition !== 'single' ? `-${s.seatPosition[0].toUpperCase()}` : ''}`;

function header(pdf: jsPDF, opts: { institutionName?: string; title: string; subtitle?: string }) {
  const w = pdf.internal.pageSize.getWidth();
  pdf.setFontSize(13); pdf.setFont('helvetica', 'bold');
  pdf.text(opts.institutionName || 'Institution', w / 2, 14, { align: 'center' });
  pdf.setFontSize(11);
  pdf.text(opts.title, w / 2, 20, { align: 'center' });
  if (opts.subtitle) {
    pdf.setFontSize(9); pdf.setFont('helvetica', 'normal');
    pdf.text(opts.subtitle, w / 2, 26, { align: 'center' });
  }
}

function footer(pdf: jsPDF) {
  const w = pdf.internal.pageSize.getWidth(), h = pdf.internal.pageSize.getHeight();
  pdf.setFontSize(8); pdf.setFont('helvetica', 'normal');
  pdf.text(`Generated: ${new Date().toLocaleString()}`, 14, h - 8);
  pdf.text('Controller of Examinations', w - 14, h - 8, { align: 'right' });
}

/** Compress sorted rolls into ranges like "21A-001 to 21A-015". */
function rollRanges(rolls: string[]): string {
  const sorted = [...rolls].sort(sortRoll);
  if (sorted.length === 0) return '';
  if (sorted.length <= 4) return sorted.join(', ');
  return `${sorted[0]} – ${sorted[sorted.length - 1]} (${sorted.length})`;
}

/* ============================================================
   1) STUDENT SEATING REGISTER (subject-wise summary notice)
   Columns: Roll Range | Block | Room | No. of Students
   Grouped per (Date, Slot, Subject, Branch)
   ============================================================ */
export interface StudentRegisterRow {
  date: string;
  slot: string;
  startTime?: string;
  endTime?: string;
  subjectCode: string;
  subjectName: string;
  branch: string;
  totalStudents: number;
  entries: Array<{ rollRange: string; block: string; room: string; count: number }>;
}

export function buildStudentRegister(plans: PlanLike[]): StudentRegisterRow[] {
  const grouped: Record<string, StudentRegisterRow> = {};
  const perGroupRoom: Record<string, Record<string, string[]>> = {};

  for (const p of plans) {
    for (const s of (p.seats || [])) {
      if (!s.rollNumber || !s.subjectCode) continue;
      const key = `${p.examDate}|${p.examSlot}|${s.subjectCode}|${s.branch || ''}`;
      if (!grouped[key]) {
        grouped[key] = {
          date: p.examDate, slot: p.examSlot,
          startTime: p.startTime, endTime: p.endTime,
          subjectCode: s.subjectCode, subjectName: s.subjectName || '',
          branch: s.branch || '', totalStudents: 0, entries: [],
        };
        perGroupRoom[key] = {};
      }
      grouped[key].totalStudents++;
      const roomKey = `${p.blockNumber}|${p.roomNumber}`;
      (perGroupRoom[key][roomKey] = perGroupRoom[key][roomKey] || []).push(s.rollNumber);
    }
  }

  Object.entries(grouped).forEach(([k, row]) => {
    row.entries = Object.entries(perGroupRoom[k]).map(([rk, rolls]) => {
      const [block, room] = rk.split('|');
      return { rollRange: rollRanges(rolls), block, room, count: rolls.length };
    }).sort((a, b) => a.block.localeCompare(b.block) || a.room.localeCompare(b.room));
  });

  return Object.values(grouped).sort((a, b) =>
    a.date.localeCompare(b.date) || a.slot.localeCompare(b.slot) ||
    a.subjectCode.localeCompare(b.subjectCode) || a.branch.localeCompare(b.branch));
}

export function exportStudentRegisterPDF(rows: StudentRegisterRow[], opts: { institutionName: string; examName: string }) {
  if (rows.length === 0) return;
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  rows.forEach((row, i) => {
    if (i > 0) pdf.addPage();
    header(pdf, {
      institutionName: opts.institutionName,
      title: 'STUDENT SEATING REGISTER',
      subtitle: `${opts.examName}  |  ${row.date}  |  ${row.slot} ${row.startTime ? `(${row.startTime}–${row.endTime})` : ''}`,
    });
    pdf.setFontSize(10); pdf.setFont('helvetica', 'bold');
    pdf.text(`Subject: ${row.subjectCode} — ${row.subjectName}`, 14, 34);
    pdf.text(`Branch: ${row.branch}    Total Students: ${row.totalStudents}`, 14, 40);
    autoTable(pdf, {
      startY: 44,
      head: [['Roll No. Range', 'Block', 'Room', 'No. of Students']],
      body: row.entries.map(e => [e.rollRange, e.block, e.room, e.count]),
      styles: { fontSize: 10, halign: 'center' },
      headStyles: { fillColor: [30, 64, 175], textColor: 255 },
      columnStyles: { 0: { halign: 'left' } },
      theme: 'grid',
    });
    footer(pdf);
  });
  pdf.save(`Student_Seating_Register_${opts.examName.replace(/\s+/g, '_')}.pdf`);
}

export function exportStudentRegisterExcel(rows: StudentRegisterRow[], opts: { examName: string }) {
  const aoa: any[][] = [['Date', 'Slot', 'Subject Code', 'Subject', 'Branch', 'Roll Range', 'Block', 'Room', 'Count']];
  rows.forEach(r => r.entries.forEach(e =>
    aoa.push([r.date, r.slot, r.subjectCode, r.subjectName, r.branch, e.rollRange, e.block, e.room, e.count])));
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Student Register');
  XLSX.writeFile(wb, `Student_Register_${opts.examName.replace(/\s+/g, '_')}.xlsx`);
}

/* ============================================================
   2) ROOM-WISE REGISTER (per room: full seat list)
   ============================================================ */
export function exportRoomWiseRegisterPDF(plans: PlanLike[], opts: { institutionName: string; examName: string }) {
  if (plans.length === 0) return;
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  plans.forEach((p, i) => {
    if (i > 0) pdf.addPage();
    header(pdf, {
      institutionName: opts.institutionName,
      title: 'ROOM-WISE SEATING REGISTER',
      subtitle: `${opts.examName}  |  ${p.examDate}  |  ${p.examSlot}`,
    });
    pdf.setFontSize(10); pdf.setFont('helvetica', 'bold');
    pdf.text(`Block ${p.blockNumber}  •  Floor ${p.floorNumber}  •  Room ${p.roomNumber}  (${p.roomType || 'classroom'})`, 14, 34);
    pdf.text(`Total Students: ${p.occupiedSeats || (p.seats || []).length}`, 14, 40);
    const body = (p.seats || []).slice().sort((a, b) => sortRoll(a.rollNumber, b.rollNumber))
      .map(s => [s.rollNumber, s.name || '', s.branch || '', s.year || '', s.subjectCode || '', seatLabel(s)]);
    autoTable(pdf, {
      startY: 44,
      head: [['Roll', 'Name', 'Branch', 'Year', 'Subject', 'Seat']],
      body, styles: { fontSize: 9 },
      headStyles: { fillColor: [30, 64, 175], textColor: 255 }, theme: 'grid',
    });
    footer(pdf);
  });
  pdf.save(`Room_Wise_Register_${opts.examName.replace(/\s+/g, '_')}.pdf`);
}

/* ============================================================
   3) BLOCK-WISE REGISTER (summary by block→room)
   ============================================================ */
export function exportBlockWiseRegisterPDF(plans: PlanLike[], opts: { institutionName: string; examName: string }) {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  header(pdf, { institutionName: opts.institutionName, title: 'BLOCK-WISE SEATING REGISTER', subtitle: opts.examName });
  const byBlock: Record<string, PlanLike[]> = {};
  plans.forEach(p => { (byBlock[String(p.blockNumber)] = byBlock[String(p.blockNumber)] || []).push(p); });
  const body: any[] = [];
  Object.keys(byBlock).sort().forEach(blk => {
    byBlock[blk].forEach(p => {
      body.push([blk, p.roomNumber, `Floor ${p.floorNumber}`, p.examDate, p.examSlot, p.occupiedSeats || (p.seats || []).length, p.totalSeats || '']);
    });
  });
  autoTable(pdf, {
    startY: 30,
    head: [['Block', 'Room', 'Floor', 'Date', 'Slot', 'Students', 'Capacity']],
    body, styles: { fontSize: 9, halign: 'center' },
    headStyles: { fillColor: [30, 64, 175], textColor: 255 }, theme: 'grid',
  });
  footer(pdf);
  pdf.save(`Block_Wise_Register_${opts.examName.replace(/\s+/g, '_')}.pdf`);
}

/* ============================================================
   4) BRANCH-WISE REGISTER (branch → room → count)
   ============================================================ */
export function exportBranchWiseRegisterPDF(plans: PlanLike[], opts: { institutionName: string; examName: string }) {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  header(pdf, { institutionName: opts.institutionName, title: 'BRANCH-WISE SEATING REGISTER', subtitle: opts.examName });
  const byBranch: Record<string, Record<string, number>> = {};
  const branchMeta: Record<string, Record<string, { block: any; date: string; slot: string }>> = {};
  plans.forEach(p => (p.seats || []).forEach(s => {
    const br = s.branch || 'UNK';
    const rk = `${p.blockNumber}|${p.roomNumber}|${p.examDate}|${p.examSlot}`;
    byBranch[br] = byBranch[br] || {};
    byBranch[br][rk] = (byBranch[br][rk] || 0) + 1;
    branchMeta[br] = branchMeta[br] || {};
    branchMeta[br][rk] = { block: p.blockNumber, date: p.examDate, slot: p.examSlot };
  }));
  const body: any[] = [];
  Object.keys(byBranch).sort().forEach(br => {
    Object.entries(byBranch[br]).forEach(([rk, count]) => {
      const [block, room] = rk.split('|');
      const meta = branchMeta[br][rk];
      body.push([br, block, room, meta.date, meta.slot, count]);
    });
  });
  autoTable(pdf, {
    startY: 30,
    head: [['Branch', 'Block', 'Room', 'Date', 'Slot', 'Students']],
    body, styles: { fontSize: 9, halign: 'center' },
    headStyles: { fillColor: [30, 64, 175], textColor: 255 }, theme: 'grid',
  });
  footer(pdf);
  pdf.save(`Branch_Wise_Register_${opts.examName.replace(/\s+/g, '_')}.pdf`);
}

/* ============================================================
   5) MASTER SEATING REGISTER (one row per student)
   ============================================================ */
export function exportMasterRegisterPDF(plans: PlanLike[], opts: { institutionName: string; examName: string }) {
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  header(pdf, { institutionName: opts.institutionName, title: 'MASTER SEATING REGISTER', subtitle: opts.examName });
  const rows: any[] = [];
  plans.forEach(p => (p.seats || []).forEach(s => {
    rows.push([s.rollNumber, s.name || '', s.branch || '', s.year || '', s.subjectCode || '', p.blockNumber, p.roomNumber, `R${s.row}-C${s.column}`, s.seatPosition || 'single']);
  }));
  rows.sort((a, b) => sortRoll(a[0], b[0]));
  autoTable(pdf, {
    startY: 30,
    head: [['Roll', 'Name', 'Branch', 'Year', 'Subject', 'Block', 'Room', 'Bench', 'Seat']],
    body: rows, styles: { fontSize: 8 },
    headStyles: { fillColor: [30, 64, 175], textColor: 255 }, theme: 'grid',
  });
  footer(pdf);
  pdf.save(`Master_Register_${opts.examName.replace(/\s+/g, '_')}.pdf`);
}

export function exportMasterRegisterExcel(plans: PlanLike[], opts: { examName: string }) {
  const aoa: any[][] = [['Roll', 'Name', 'Branch', 'Year', 'Subject Code', 'Subject', 'Block', 'Room', 'Bench', 'Seat Position', 'Date', 'Slot']];
  const rows: any[][] = [];
  plans.forEach(p => (p.seats || []).forEach(s => {
    rows.push([s.rollNumber, s.name || '', s.branch || '', s.year || '', s.subjectCode || '', s.subjectName || '',
      p.blockNumber, p.roomNumber, s.bench || s.column, s.seatPosition || 'single', p.examDate, p.examSlot]);
  }));
  rows.sort((a, b) => sortRoll(a[0], b[0]));
  rows.forEach(r => aoa.push(r));
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Master Register');
  XLSX.writeFile(wb, `Master_Register_${opts.examName.replace(/\s+/g, '_')}.xlsx`);
}
