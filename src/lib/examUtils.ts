// Shared helpers for the Exams module.

export const YEAR_LABELS = ['1st Year', '2nd Year', '3rd Year', '4th Year'];

/** Normalize "1st" / "1st Year" / "1" -> "1st" */
export const normYear = (y: any): string => {
  if (!y) return '';
  const s = String(y).toLowerCase().replace(/\s*year\s*/g, '').trim();
  if (s.startsWith('1')) return '1st';
  if (s.startsWith('2')) return '2nd';
  if (s.startsWith('3')) return '3rd';
  if (s.startsWith('4')) return '4th';
  return s;
};

export const yearToLabel = (y: any) => `${normYear(y)} Year`;

export const SLOT_TIMES: Record<string, { start: string; end: string }> = {
  Morning: { start: '09:30', end: '12:30' },
  Afternoon: { start: '14:00', end: '17:00' },
  Evening: { start: '17:30', end: '20:30' },
};

/** True if room should be used for examination seating (classroom or lab only). */
export const isUsableExamRoom = (roomType: any): boolean => {
  const t = String(roomType || 'classroom').toLowerCase();
  if (!t) return true;
  const banned = ['hod', 'faculty', 'staff', 'wash', 'toilet', 'restroom', 'store', 'office'];
  if (banned.some(k => t.includes(k))) return false;
  return t.includes('class') || t.includes('lab') || t.includes('hall') || t === 'classroom';
};

export const isLabRoom = (roomType: any): boolean => {
  const t = String(roomType || '').toLowerCase();
  return t.includes('lab') || t.includes('practical') || t.includes('computer');
};

export const roomCapacity = (room: any): number => {
  const rows = parseInt(room.rowsOfBenches ?? room.rows, 10) || 0;
  const cols = parseInt(room.columnsOfBenches ?? room.columns, 10) || 0;
  if (!rows || !cols) return 0;
  return isLabRoom(room.roomType) ? rows * cols : rows * cols * 2;
};

/** Add days to a YYYY-MM-DD string. */
export const addDays = (isoDate: string, days: number): string => {
  const d = new Date(isoDate);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
};

export const todayPlus = (days: number): string => addDays(new Date().toISOString().split('T')[0], days);

export const isSunday = (isoDate: string): boolean => new Date(isoDate + 'T00:00:00').getDay() === 0;
