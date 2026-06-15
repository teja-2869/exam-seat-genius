// University-style timetable matrix + PDF / Excel / Print export.
// Pure helpers — no Firestore calls.

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { SLOT_TIMES } from './examUtils';

export interface MatrixCell {
  date: string;
  branch: string;
  subjectCode: string;
  subjectName: string;
  slot: string;
  startTime: string;
  endTime: string;
  year?: string;
}

export interface TimetableMatrix {
  dates: string[];
  branches: string[];
  // rows[date][branch] = array of cells (a branch can have >1 paper per day)
  rows: Record<string, Record<string, MatrixCell[]>>;
  slots: Record<string, { start: string; end: string }>;
}

export function buildTimetableMatrix(scheduleRows: any[], allBranches?: string[]): TimetableMatrix {
  const dateSet = new Set<string>();
  const branchSet = new Set<string>(allBranches || []);
  const rows: Record<string, Record<string, MatrixCell[]>> = {};
  const slots: Record<string, { start: string; end: string }> = {};

  for (const r of scheduleRows) {
    dateSet.add(r.date);
    const branches: string[] = r.branches || [];
    branches.forEach(b => branchSet.add(b));
    slots[r.slot] = SLOT_TIMES[r.slot] || { start: r.startTime || '', end: r.endTime || '' };
    rows[r.date] = rows[r.date] || {};
    for (const b of branches) {
      (rows[r.date][b] = rows[r.date][b] || []).push({
        date: r.date,
        branch: b,
        subjectCode: r.subjectCode,
        subjectName: r.subjectName,
        slot: r.slot,
        startTime: r.startTime || SLOT_TIMES[r.slot]?.start || '',
        endTime: r.endTime || SLOT_TIMES[r.slot]?.end || '',
        year: r.year,
      });
    }
  }
  return {
    dates: Array.from(dateSet).sort(),
    branches: Array.from(branchSet).sort(),
    rows,
    slots,
  };
}

function fmtDate(iso: string) {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-GB'); // dd/mm/yyyy
}

/** Compact cell rendering: "CODE\nName\n(slot)" */
function cellToText(cells: MatrixCell[] | undefined): string {
  if (!cells || cells.length === 0) return '—';
  return cells.map(c => `${c.subjectCode}\n${c.subjectName}${cells.length > 1 ? `\n(${c.slot})` : ''}`).join('\n\n');
}

export function exportTimetablePDF(opts: {
  matrix: TimetableMatrix;
  institutionName: string;
  examName: string;
  academicYear?: string;
  semester?: string;
  regulation?: string;
}) {
  const { matrix } = opts;
  const orientation = matrix.branches.length > 5 ? 'landscape' : 'portrait';
  const pdf = new jsPDF({ orientation, unit: 'mm', format: 'a4' });
  const pageWidth = pdf.internal.pageSize.getWidth();

  pdf.setFontSize(14); pdf.setFont('helvetica', 'bold');
  pdf.text(opts.institutionName || 'Institution', pageWidth / 2, 14, { align: 'center' });
  pdf.setFontSize(11);
  pdf.text(`${opts.examName} — Examination Timetable`, pageWidth / 2, 20, { align: 'center' });
  pdf.setFontSize(9); pdf.setFont('helvetica', 'normal');
  const meta = [
    opts.academicYear ? `Academic Year: ${opts.academicYear}` : '',
    opts.semester ? `Semester: ${opts.semester}` : '',
    opts.regulation ? `Regulation: ${opts.regulation}` : '',
  ].filter(Boolean).join('   |   ');
  if (meta) pdf.text(meta, pageWidth / 2, 26, { align: 'center' });

  // Slot timings legend
  const slotTxt = Object.entries(matrix.slots)
    .map(([k, v]) => `${k}: ${v.start}–${v.end}`).join('     ');
  if (slotTxt) pdf.text(slotTxt, pageWidth / 2, 32, { align: 'center' });

  const head = [['Date', ...matrix.branches]];
  const body = matrix.dates.map(d => [fmtDate(d), ...matrix.branches.map(b => cellToText(matrix.rows[d]?.[b]))]);

  autoTable(pdf, {
    startY: 38,
    head,
    body,
    styles: { fontSize: 8, cellPadding: 2, valign: 'middle', halign: 'center', lineWidth: 0.2, lineColor: [60, 60, 60] },
    headStyles: { fillColor: [30, 64, 175], textColor: 255, fontStyle: 'bold' },
    columnStyles: { 0: { fontStyle: 'bold', fillColor: [243, 244, 246] } },
    theme: 'grid',
  });

  pdf.setFontSize(8);
  pdf.text(`Generated: ${new Date().toLocaleString()}`, 14, pdf.internal.pageSize.getHeight() - 8);
  pdf.text('Controller of Examinations', pageWidth - 14, pdf.internal.pageSize.getHeight() - 8, { align: 'right' });

  pdf.save(`Timetable_${(opts.examName || 'exam').replace(/\s+/g, '_')}.pdf`);
}

export function exportTimetableExcel(opts: {
  matrix: TimetableMatrix;
  institutionName: string;
  examName: string;
}) {
  const { matrix } = opts;
  const aoa: any[][] = [];
  aoa.push([opts.institutionName]);
  aoa.push([`${opts.examName} — Examination Timetable`]);
  aoa.push([]);
  aoa.push(['Date', ...matrix.branches]);
  matrix.dates.forEach(d => {
    aoa.push([fmtDate(d), ...matrix.branches.map(b => {
      const cells = matrix.rows[d]?.[b];
      if (!cells || cells.length === 0) return '';
      return cells.map(c => `${c.subjectCode} — ${c.subjectName}${cells.length > 1 ? ` (${c.slot})` : ''}`).join(' | ');
    })]);
  });
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = [{ wch: 14 }, ...matrix.branches.map(() => ({ wch: 28 }))];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Timetable');
  XLSX.writeFile(wb, `Timetable_${(opts.examName || 'exam').replace(/\s+/g, '_')}.xlsx`);
}

export function printTimetable(opts: {
  matrix: TimetableMatrix;
  institutionName: string;
  examName: string;
  academicYear?: string;
  semester?: string;
  regulation?: string;
}) {
  const { matrix } = opts;
  const w = window.open('', '_blank', 'width=1200,height=800');
  if (!w) return;
  const slotTxt = Object.entries(matrix.slots).map(([k, v]) => `<b>${k}</b>: ${v.start}–${v.end}`).join('&nbsp;&nbsp;|&nbsp;&nbsp;');
  const html = `
<!doctype html><html><head><title>${opts.examName} — Timetable</title>
<style>
  body{font-family:Arial,sans-serif;margin:24px;color:#111}
  h1{margin:0;text-align:center;font-size:18px}
  h2{margin:4px 0 2px;text-align:center;font-size:14px;font-weight:500}
  .meta{text-align:center;font-size:11px;margin:4px 0 12px;color:#444}
  table{width:100%;border-collapse:collapse;font-size:11px}
  th,td{border:1px solid #444;padding:6px;text-align:center;vertical-align:middle}
  th{background:#1e40af;color:#fff}
  td.date{background:#f3f4f6;font-weight:bold;white-space:nowrap}
  td .code{font-weight:bold}
  td .name{font-size:10px;color:#333}
  @media print { @page { size: A4 landscape; margin: 10mm } }
</style></head><body>
<h1>${opts.institutionName || ''}</h1>
<h2>${opts.examName} — Examination Timetable</h2>
<div class="meta">${[opts.academicYear && `Academic Year: ${opts.academicYear}`, opts.semester && `Semester: ${opts.semester}`, opts.regulation && `Regulation: ${opts.regulation}`].filter(Boolean).join(' | ')}</div>
<div class="meta">${slotTxt}</div>
<table>
  <thead><tr><th>Date</th>${matrix.branches.map(b => `<th>${b}</th>`).join('')}</tr></thead>
  <tbody>
  ${matrix.dates.map(d => `<tr><td class="date">${fmtDate(d)}</td>${matrix.branches.map(b => {
    const cells = matrix.rows[d]?.[b] || [];
    if (cells.length === 0) return '<td>—</td>';
    return `<td>${cells.map(c => `<div><div class="code">${c.subjectCode}</div><div class="name">${c.subjectName}${cells.length > 1 ? ` (${c.slot})` : ''}</div></div>`).join('<hr style="margin:4px 0;border:none;border-top:1px dashed #999"/>')}</td>`;
  }).join('')}</tr>`).join('')}
  </tbody>
</table>
<div style="margin-top:14px;font-size:10px;display:flex;justify-content:space-between">
  <span>Generated: ${new Date().toLocaleString()}</span>
  <span>Controller of Examinations</span>
</div>
<script>window.onload=()=>setTimeout(()=>window.print(),200)</script>
</body></html>`;
  w.document.write(html); w.document.close();
}
