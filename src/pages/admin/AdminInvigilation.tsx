import React, { useState, useEffect, useMemo } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
  Users, UserCheck, UserX, Calendar as CalendarIcon, MapPin, Building2, Sun, Moon,
  Search, Sparkles, Download, Printer, FileSpreadsheet, FileText, RefreshCw, Eye,
  AlertTriangle, ClipboardList, Lock, Trash2, ArrowRightLeft, Loader2, Mail, Phone,
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import {
  collection, query, where, getDocs, doc, updateDoc, deleteDoc, serverTimestamp,
} from 'firebase/firestore';
import { generateDutiesForSession, logAudit } from '@/services/operationsService';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Duty {
  id: string;
  institutionId: string;
  sessionId?: string;
  sessionName?: string;
  date: string;
  slot: string;
  startTime?: string;
  endTime?: string;
  roomId?: string;
  roomNumber: string;
  blockNumber: string;
  floorNumber?: string | number;
  roomType?: string;
  studentCount?: number;
  assignedFacultyId?: string;
  assignedFacultyName?: string;
  assignedFacultyIdCard?: string;
  facultyEmail?: string;
  facultyPhone?: string;
  facultyDepartment?: string;
  status?: string;
  attendanceSubmitted?: boolean;
  reportSubmitted?: boolean;
  subjectCode?: string;
  subjectName?: string;
}

interface FacultyDoc {
  id: string; name: string; email?: string; phone?: string;
  branchId?: string; branch?: string; facultyId?: string; gender?: string;
  role?: string; examEligibility?: boolean; availabilityStatus?: string;
}
interface SessionDoc { id: string; name?: string; branches?: string[]; }

const KPI: React.FC<{ label: string; value: string | number; icon: React.ReactNode; accent: string; sub?: string }>
  = ({ label, value, icon, accent, sub }) => (
    <Card className="border-none shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
            <p className="text-2xl font-display font-bold text-foreground mt-1 truncate">{value}</p>
            {sub && <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{sub}</p>}
          </div>
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${accent}`}>{icon}</div>
        </div>
      </CardContent>
    </Card>
  );

const STATUS_VARIANT: Record<string, { label: string; className: string }> = {
  upcoming: { label: 'Assigned', className: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30' },
  accepted: { label: 'Accepted', className: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/30' },
  reported: { label: 'Reported', className: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30' },
  in_progress: { label: 'In Progress', className: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30' },
  completed: { label: 'Completed', className: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30' },
  absent: { label: 'Absent', className: 'bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30' },
  replaced: { label: 'Replacement', className: 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30' },
  cancelled: { label: 'Cancelled', className: 'bg-muted text-muted-foreground border-border' },
};
const statusBadge = (s?: string) => {
  const key = (s || 'upcoming').toLowerCase();
  const v = STATUS_VARIANT[key] || STATUS_VARIANT.upcoming;
  return <Badge variant="outline" className={`${v.className} font-medium`}>{v.label}</Badge>;
};

const PAGE_SIZE = 25;

export default function AdminInvigilation() {
  const { user, college } = useAuth();
  const institutionId = (user as any)?.institutionId || (user as any)?.collegeId || college?.id || '';
  const adminId = (user as any)?.uid || (user as any)?.id || '';
  const adminName = (user as any)?.name || 'Admin';

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [duties, setDuties] = useState<Duty[]>([]);
  const [faculty, setFaculty] = useState<FacultyDoc[]>([]);
  const [sessions, setSessions] = useState<SessionDoc[]>([]);

  const [filters, setFilters] = useState({
    exam: 'all', date: 'all', slot: 'all', department: 'all',
    faculty: 'all', block: 'all', floor: 'all', room: 'all', status: 'all',
  });
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedFaculty, setSelectedFaculty] = useState<Duty | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<Duty | null>(null);
  const [conflictOpen, setConflictOpen] = useState(false);
  const [generateSessionId, setGenerateSessionId] = useState<string>('');
  const [replaceOpen, setReplaceOpen] = useState<Duty | null>(null);
  const [replaceFacultyId, setReplaceFacultyId] = useState('');

  const loadData = async () => {
    if (!institutionId) { setLoading(false); return; }
    try {
      setRefreshing(true);
      const [dSnap, fSnap, sSnap] = await Promise.all([
        getDocs(query(collection(db, 'invigilations'), where('institutionId', '==', institutionId))),
        getDocs(query(collection(db, 'users'), where('institutionId', '==', institutionId), where('role', '==', 'faculty'))),
        getDocs(query(collection(db, 'examSessions'), where('institutionId', '==', institutionId))),
      ]);
      const rows = dSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) } as Duty));
      rows.sort((a, b) => (a.date || '').localeCompare(b.date || '') || (a.slot || '').localeCompare(b.slot || ''));
      setDuties(rows);
      setFaculty(fSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) } as FacultyDoc)));
      setSessions(sSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) } as SessionDoc)));
    } catch (err) {
      console.error(err);
      toast.error('Failed to load invigilation data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadData(); /* eslint-disable-next-line */ }, [institutionId]);

  const opts = useMemo(() => {
    const uniq = (arr: (string | undefined | null)[]) => Array.from(new Set(arr.filter(Boolean).map(String))) as string[];
    return {
      exams: uniq(duties.map(d => d.sessionName)),
      dates: uniq(duties.map(d => d.date)).sort(),
      slots: uniq(duties.map(d => d.slot)),
      departments: uniq(duties.map(d => d.facultyDepartment)),
      faculty: uniq(duties.map(d => d.assignedFacultyName)),
      blocks: uniq(duties.map(d => d.blockNumber)),
      floors: uniq(duties.map(d => d.floorNumber ? String(d.floorNumber) : '')),
      rooms: uniq(duties.map(d => d.roomNumber)),
      statuses: uniq(duties.map(d => d.status)),
    };
  }, [duties]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return duties.filter(d => {
      if (filters.exam !== 'all' && d.sessionName !== filters.exam) return false;
      if (filters.date !== 'all' && d.date !== filters.date) return false;
      if (filters.slot !== 'all' && d.slot !== filters.slot) return false;
      if (filters.department !== 'all' && d.facultyDepartment !== filters.department) return false;
      if (filters.faculty !== 'all' && d.assignedFacultyName !== filters.faculty) return false;
      if (filters.block !== 'all' && d.blockNumber !== filters.block) return false;
      if (filters.floor !== 'all' && String(d.floorNumber || '') !== filters.floor) return false;
      if (filters.room !== 'all' && d.roomNumber !== filters.room) return false;
      if (filters.status !== 'all') {
        if (filters.status === 'unassigned' ? !!d.assignedFacultyId : d.status !== filters.status) return false;
      }
      if (q) {
        const hay = [
          d.assignedFacultyName, d.assignedFacultyIdCard, d.facultyDepartment,
          d.roomNumber, d.blockNumber, d.sessionName, d.subjectCode, d.subjectName,
        ].filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [duties, filters, search]);

  // KPIs
  const kpis = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const assigned = duties.filter(d => !!d.assignedFacultyId);
    const facultyAssigned = new Set(assigned.map(d => d.assignedFacultyId)).size;
    const pending = duties.filter(d => !d.assignedFacultyId).length;
    const todayDuties = duties.filter(d => d.date === today);
    const todayFacultyCount = new Set(todayDuties.map(d => d.assignedFacultyId).filter(Boolean)).size;
    const roomsCovered = new Set(assigned.map(d => `${d.blockNumber}::${d.roomNumber}`)).size;
    const blocksCovered = new Set(assigned.map(d => d.blockNumber)).size;
    const morning = new Set(duties.filter(d => /morning/i.test(d.slot || '')).map(d => d.assignedFacultyId).filter(Boolean)).size;
    const afternoon = new Set(duties.filter(d => /afternoon/i.test(d.slot || '')).map(d => d.assignedFacultyId).filter(Boolean)).size;
    return {
      totalFaculty: faculty.length,
      facultyAssigned,
      pending,
      todayFaculty: todayFacultyCount,
      roomsCovered,
      blocksCovered,
      morning,
      afternoon,
    };
  }, [duties, faculty]);

  // Conflicts
  const conflicts = useMemo(() => {
    const bySlot: Record<string, Duty[]> = {};
    const dupeRoom: Duty[][] = [];
    const perFaculty: Record<string, Duty[]> = {};
    duties.forEach(d => {
      if (!d.assignedFacultyId) return;
      const key = `${d.date}|${d.slot}|${d.assignedFacultyId}`;
      (bySlot[key] = bySlot[key] || []).push(d);
      (perFaculty[d.assignedFacultyId] = perFaculty[d.assignedFacultyId] || []).push(d);
    });
    const doubleBooked = Object.values(bySlot).filter(a => a.length > 1);
    const roomKeyMap: Record<string, Duty[]> = {};
    duties.forEach(d => {
      const rk = `${d.date}|${d.slot}|${d.blockNumber}|${d.roomNumber}`;
      (roomKeyMap[rk] = roomKeyMap[rk] || []).push(d);
    });
    Object.values(roomKeyMap).forEach(a => { if (a.length > 1) dupeRoom.push(a); });
    const overloaded = Object.entries(perFaculty).filter(([, arr]) => arr.length > 10);
    const unassigned = duties.filter(d => !d.assignedFacultyId);
    return { doubleBooked, dupeRoom, overloaded, unassigned };
  }, [duties]);

  // Analytics
  const analytics = useMemo(() => {
    const byDept: Record<string, number> = {};
    const byBlock: Record<string, number> = {};
    const byFaculty: Record<string, number> = {};
    duties.forEach(d => {
      if (d.facultyDepartment) byDept[d.facultyDepartment] = (byDept[d.facultyDepartment] || 0) + 1;
      if (d.blockNumber) byBlock[d.blockNumber] = (byBlock[d.blockNumber] || 0) + 1;
      if (d.assignedFacultyName) byFaculty[d.assignedFacultyName] = (byFaculty[d.assignedFacultyName] || 0) + 1;
    });
    return {
      dept: Object.entries(byDept).map(([name, count]) => ({ name, count })),
      block: Object.entries(byBlock).map(([name, count]) => ({ name, count })),
      faculty: Object.entries(byFaculty).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, count]) => ({ name, count })),
      avg: faculty.length ? (duties.filter(d => d.assignedFacultyId).length / faculty.length).toFixed(1) : '0',
      completed: duties.filter(d => d.status === 'completed').length,
      pending: duties.filter(d => d.status === 'upcoming').length,
    };
  }, [duties, faculty]);

  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  const handleGenerate = async () => {
    if (!generateSessionId) { toast.error('Select an exam session first'); return; }
    setGenerating(true);
    try {
      const stats = await generateDutiesForSession(generateSessionId, institutionId, adminId, adminName);
      toast.success(`AI assigned ${stats.assigned} rooms · ${stats.unassigned} unassigned`);
      if (stats.warnings.length) toast.warning(`${stats.warnings.length} conflicts detected — see Conflict Report`);
      await loadData();
    } catch (err: any) {
      toast.error(err?.message || 'Duty generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const handleRemove = async (d: Duty) => {
    if (!confirm('Remove this duty assignment?')) return;
    await deleteDoc(doc(db, 'invigilations', d.id));
    await logAudit(adminId, adminName, 'admin', institutionId, 'Duty Removed', `Removed duty for ${d.assignedFacultyName} in Room ${d.roomNumber}`);
    toast.success('Duty removed');
    loadData();
  };
  const handleLock = async (d: Duty) => {
    await updateDoc(doc(db, 'invigilations', d.id), { locked: true, updatedAt: serverTimestamp() });
    await logAudit(adminId, adminName, 'admin', institutionId, 'Duty Locked', `Locked duty for ${d.assignedFacultyName} in Room ${d.roomNumber}`);
    toast.success('Duty locked');
    loadData();
  };
  const handleReplace = async () => {
    if (!replaceOpen || !replaceFacultyId) return;
    const f = faculty.find(x => x.id === replaceFacultyId);
    if (!f) return;
    await updateDoc(doc(db, 'invigilations', replaceOpen.id), {
      assignedFacultyId: f.id,
      assignedFacultyName: f.name,
      assignedFacultyIdCard: f.facultyId || f.id.slice(0, 6),
      facultyEmail: f.email || '',
      facultyPhone: f.phone || '',
      facultyDepartment: f.branchId || f.branch || 'General',
      status: 'replaced',
      updatedAt: serverTimestamp(),
    });
    await logAudit(adminId, adminName, 'admin', institutionId, 'Duty Replaced',
      `Replaced ${replaceOpen.assignedFacultyName} with ${f.name} in Room ${replaceOpen.roomNumber}`);
    toast.success('Faculty replaced');
    setReplaceOpen(null); setReplaceFacultyId('');
    loadData();
  };

  // Exports
  const exportRows = () => filtered.map(d => ({
    'Faculty ID': d.assignedFacultyIdCard || '',
    'Faculty Name': d.assignedFacultyName || '',
    Department: d.facultyDepartment || '',
    Exam: d.sessionName || '',
    Date: d.date, Session: d.slot,
    Block: d.blockNumber, Floor: d.floorNumber ?? '', Room: d.roomNumber,
    'Students': d.studentCount ?? '',
    Time: `${d.startTime || ''} - ${d.endTime || ''}`,
    Status: (d.status || 'upcoming'),
  }));
  const doExportExcel = () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(exportRows()), 'Duties');
    XLSX.writeFile(wb, `invigilation-duties-${Date.now()}.xlsx`);
  };
  const doExportCSV = () => {
    const ws = XLSX.utils.json_to_sheet(exportRows());
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `invigilation-duties-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };
  const doExportPDF = () => {
    const pdf = new jsPDF({ orientation: 'landscape' });
    pdf.setFontSize(14); pdf.text('Invigilation Duty List', 14, 14);
    pdf.setFontSize(9); pdf.text(`Generated: ${new Date().toLocaleString()} · ${filtered.length} duties`, 14, 20);
    autoTable(pdf, {
      startY: 24, styles: { fontSize: 8 }, headStyles: { fillColor: [30, 41, 59] },
      head: [['Fac ID', 'Name', 'Dept', 'Exam', 'Date', 'Slot', 'Block', 'Room', 'Time', 'Status']],
      body: filtered.map(d => [
        d.assignedFacultyIdCard || '', d.assignedFacultyName || '', d.facultyDepartment || '',
        d.sessionName || '', d.date, d.slot, d.blockNumber, d.roomNumber,
        `${d.startTime || ''}-${d.endTime || ''}`, (d.status || 'upcoming'),
      ]),
    });
    pdf.save(`invigilation-duties-${Date.now()}.pdf`);
  };
  const doPrint = () => window.print();

  // ---------- Faculty history for drawer ----------
  const facultyHistory = (facId?: string) =>
    duties.filter(d => d.assignedFacultyId === facId).sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 space-y-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Admin · Operations</p>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground mt-1">Invigilation Duty Management</h1>
            <p className="text-sm text-muted-foreground mt-1">AI-powered faculty allocation, conflict detection, and duty analytics.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={loadData} disabled={refreshing}>
              <RefreshCw className={`w-4 h-4 mr-1.5 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={() => setConflictOpen(true)}>
              <AlertTriangle className="w-4 h-4 mr-1.5" /> Conflict Report
              {(conflicts.doubleBooked.length + conflicts.dupeRoom.length + conflicts.overloaded.length) > 0 && (
                <Badge className="ml-2 h-5 px-1.5 bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/30">
                  {conflicts.doubleBooked.length + conflicts.dupeRoom.length + conflicts.overloaded.length}
                </Badge>
              )}
            </Button>
          </div>
        </div>

        {/* AI Generator */}
        <Card className="border-none shadow-sm bg-gradient-to-br from-accent/5 to-primary/5">
          <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-sm truncate">AI Invigilation Engine</p>
                <p className="text-xs text-muted-foreground truncate">Balanced, conflict-free allocation across seating plans</p>
              </div>
            </div>
            <div className="flex-1 flex flex-col sm:flex-row gap-2 sm:justify-end">
              <Select value={generateSessionId} onValueChange={setGenerateSessionId}>
                <SelectTrigger className="w-full sm:w-72"><SelectValue placeholder="Select exam session" /></SelectTrigger>
                <SelectContent>
                  {sessions.map(s => <SelectItem key={s.id} value={s.id}>{s.name || s.id}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button onClick={handleGenerate} disabled={generating || !generateSessionId}>
                {generating ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1.5" />}
                Generate Duties
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
          <KPI label="Total Faculty" value={kpis.totalFaculty} icon={<Users className="w-5 h-5 text-primary" />} accent="bg-primary/10" />
          <KPI label="Faculty Assigned" value={kpis.facultyAssigned} icon={<UserCheck className="w-5 h-5 text-emerald-600" />} accent="bg-emerald-500/10" />
          <KPI label="Pending" value={kpis.pending} icon={<UserX className="w-5 h-5 text-red-600" />} accent="bg-red-500/10" />
          <KPI label="Today's Invigilators" value={kpis.todayFaculty} icon={<CalendarIcon className="w-5 h-5 text-indigo-600" />} accent="bg-indigo-500/10" />
          <KPI label="Rooms Covered" value={kpis.roomsCovered} icon={<MapPin className="w-5 h-5 text-cyan-600" />} accent="bg-cyan-500/10" />
          <KPI label="Blocks Covered" value={kpis.blocksCovered} icon={<Building2 className="w-5 h-5 text-purple-600" />} accent="bg-purple-500/10" />
          <KPI label="Morning" value={kpis.morning} icon={<Sun className="w-5 h-5 text-amber-600" />} accent="bg-amber-500/10" />
          <KPI label="Afternoon" value={kpis.afternoon} icon={<Moon className="w-5 h-5 text-slate-600" />} accent="bg-slate-500/10" />
        </div>

        <Tabs defaultValue="duties" className="space-y-4">
          <TabsList>
            <TabsTrigger value="duties">Duty Table</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="duties" className="space-y-4">
            {/* Filters */}
            <Card className="border-none shadow-sm">
              <CardContent className="p-4 space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Search faculty, ID, department, room, block..." className="pl-9"
                    value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-9 gap-2">
                  {[
                    { k: 'exam', label: 'Exam', o: opts.exams },
                    { k: 'date', label: 'Date', o: opts.dates },
                    { k: 'slot', label: 'Session', o: opts.slots },
                    { k: 'department', label: 'Department', o: opts.departments },
                    { k: 'faculty', label: 'Faculty', o: opts.faculty },
                    { k: 'block', label: 'Block', o: opts.blocks },
                    { k: 'floor', label: 'Floor', o: opts.floors },
                    { k: 'room', label: 'Room', o: opts.rooms },
                  ].map(f => (
                    <Select key={f.k} value={(filters as any)[f.k]} onValueChange={v => { setFilters(p => ({ ...p, [f.k]: v })); setPage(1); }}>
                      <SelectTrigger className="h-9 text-xs"><SelectValue placeholder={f.label} /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All {f.label}</SelectItem>
                        {f.o.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  ))}
                  <Select value={filters.status} onValueChange={v => { setFilters(p => ({ ...p, status: v })); setPage(1); }}>
                    <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {opts.statuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button size="sm" variant="outline" onClick={doExportPDF}><FileText className="w-4 h-4 mr-1.5" />PDF</Button>
                  <Button size="sm" variant="outline" onClick={doExportExcel}><FileSpreadsheet className="w-4 h-4 mr-1.5" />Excel</Button>
                  <Button size="sm" variant="outline" onClick={doExportCSV}><Download className="w-4 h-4 mr-1.5" />CSV</Button>
                  <Button size="sm" variant="outline" onClick={doPrint}><Printer className="w-4 h-4 mr-1.5" />Print</Button>
                  <div className="ml-auto text-xs text-muted-foreground self-center">
                    {filtered.length} duties · page {page}/{totalPages}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Duty Table */}
            <Card className="border-none shadow-sm">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-card z-10">
                      <TableRow>
                        <TableHead>Fac ID</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Exam</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Session</TableHead>
                        <TableHead>Block</TableHead>
                        <TableHead>Floor</TableHead>
                        <TableHead>Room</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? Array.from({ length: 6 }).map((_, i) => (
                        <TableRow key={i}><TableCell colSpan={11}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
                      )) : paged.length === 0 ? (
                        <TableRow><TableCell colSpan={11} className="text-center py-10 text-sm text-muted-foreground">
                          No duties match your filters. Use the AI engine to generate duties for an exam session.
                        </TableCell></TableRow>
                      ) : paged.map(d => (
                        <TableRow key={d.id} className="hover:bg-muted/40">
                          <TableCell className="font-mono text-xs">{d.assignedFacultyIdCard || '—'}</TableCell>
                          <TableCell className="font-medium">{d.assignedFacultyName || <span className="text-muted-foreground">Unassigned</span>}</TableCell>
                          <TableCell className="text-xs">{d.facultyDepartment || '—'}</TableCell>
                          <TableCell className="text-xs truncate max-w-[160px]">{d.sessionName}</TableCell>
                          <TableCell className="text-xs">{d.date}</TableCell>
                          <TableCell className="text-xs">{d.slot}</TableCell>
                          <TableCell className="text-xs">{d.blockNumber}</TableCell>
                          <TableCell className="text-xs">{d.floorNumber ?? '—'}</TableCell>
                          <TableCell className="text-xs font-medium">{d.roomNumber}</TableCell>
                          <TableCell>{statusBadge(d.status)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button size="icon" variant="ghost" title="Faculty details" onClick={() => setSelectedFaculty(d)}><Eye className="w-4 h-4" /></Button>
                              <Button size="icon" variant="ghost" title="Room details" onClick={() => setSelectedRoom(d)}><MapPin className="w-4 h-4" /></Button>
                              <Button size="icon" variant="ghost" title="Replace faculty" onClick={() => { setReplaceOpen(d); setReplaceFacultyId(''); }}><ArrowRightLeft className="w-4 h-4" /></Button>
                              <Button size="icon" variant="ghost" title="Lock" onClick={() => handleLock(d)}><Lock className="w-4 h-4" /></Button>
                              <Button size="icon" variant="ghost" title="Remove" onClick={() => handleRemove(d)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {totalPages > 1 && (
                  <div className="flex justify-between items-center px-4 py-3 border-t">
                    <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
                    <div className="text-xs text-muted-foreground">Page {page} of {totalPages}</div>
                    <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <KPI label="Avg Duties / Faculty" value={analytics.avg} icon={<Users className="w-5 h-5 text-primary" />} accent="bg-primary/10" />
              <KPI label="Completed" value={analytics.completed} icon={<UserCheck className="w-5 h-5 text-emerald-600" />} accent="bg-emerald-500/10" />
              <KPI label="Pending" value={analytics.pending} icon={<ClipboardList className="w-5 h-5 text-amber-600" />} accent="bg-amber-500/10" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card className="border-none shadow-sm">
                <CardHeader><CardTitle className="text-base">Department-wise Duties</CardTitle></CardHeader>
                <CardContent style={{ height: 280 }}>
                  <ResponsiveContainer>
                    <BarChart data={analytics.dept}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} />
                      <Tooltip /><Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card className="border-none shadow-sm">
                <CardHeader><CardTitle className="text-base">Block-wise Coverage</CardTitle></CardHeader>
                <CardContent style={{ height: 280 }}>
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={analytics.block} dataKey="count" nameKey="name" outerRadius={90} label>
                        {analytics.block.map((_, i) => <Cell key={i} fill={['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'][i % 6]} />)}
                      </Pie>
                      <Tooltip /><Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card className="border-none shadow-sm lg:col-span-2">
                <CardHeader><CardTitle className="text-base">Top 10 Faculty Utilization</CardTitle></CardHeader>
                <CardContent style={{ height: 320 }}>
                  <ResponsiveContainer>
                    <BarChart data={analytics.faculty} layout="vertical" margin={{ left: 60 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={120} />
                      <Tooltip /><Bar dataKey="count" fill="hsl(var(--accent))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Faculty Detail Drawer */}
      <Sheet open={!!selectedFaculty} onOpenChange={o => !o && setSelectedFaculty(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selectedFaculty && (() => {
            const hist = facultyHistory(selectedFaculty.assignedFacultyId);
            return (
              <>
                <SheetHeader>
                  <SheetTitle>{selectedFaculty.assignedFacultyName || 'Unassigned'}</SheetTitle>
                  <SheetDescription>{selectedFaculty.facultyDepartment} · ID {selectedFaculty.assignedFacultyIdCard}</SheetDescription>
                </SheetHeader>
                <div className="mt-4 space-y-4">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2 min-w-0"><Mail className="w-4 h-4 text-muted-foreground shrink-0" /><span className="truncate">{selectedFaculty.facultyEmail || '—'}</span></div>
                    <div className="flex items-center gap-2 min-w-0"><Phone className="w-4 h-4 text-muted-foreground shrink-0" /><span className="truncate">{selectedFaculty.facultyPhone || '—'}</span></div>
                  </div>
                  <Card className="border-none shadow-sm bg-muted/40">
                    <CardContent className="p-4 space-y-1 text-sm">
                      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Current Duty</p>
                      <p><span className="text-muted-foreground">Exam:</span> {selectedFaculty.sessionName}</p>
                      <p><span className="text-muted-foreground">Date:</span> {selectedFaculty.date} · {selectedFaculty.slot}</p>
                      <p><span className="text-muted-foreground">Room:</span> Block {selectedFaculty.blockNumber} · Floor {selectedFaculty.floorNumber} · Room {selectedFaculty.roomNumber}</p>
                      <p><span className="text-muted-foreground">Time:</span> {selectedFaculty.startTime} - {selectedFaculty.endTime}</p>
                      <p><span className="text-muted-foreground">Status:</span> {statusBadge(selectedFaculty.status)}</p>
                    </CardContent>
                  </Card>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">History ({hist.length})</p>
                    <div className="space-y-2 max-h-[400px] overflow-y-auto">
                      {hist.map(h => (
                        <div key={h.id} className="p-2.5 rounded border text-xs flex justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-medium truncate">{h.sessionName}</p>
                            <p className="text-muted-foreground">{h.date} · {h.slot} · Room {h.roomNumber}</p>
                          </div>
                          {statusBadge(h.status)}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            );
          })()}
        </SheetContent>
      </Sheet>

      {/* Room Drawer */}
      <Sheet open={!!selectedRoom} onOpenChange={o => !o && setSelectedRoom(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selectedRoom && (
            <>
              <SheetHeader>
                <SheetTitle>Room {selectedRoom.roomNumber}</SheetTitle>
                <SheetDescription>Block {selectedRoom.blockNumber} · Floor {selectedRoom.floorNumber}</SheetDescription>
              </SheetHeader>
              <div className="mt-4 space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div><p className="text-xs text-muted-foreground">Capacity</p><p className="font-semibold">{selectedRoom.studentCount || '—'}</p></div>
                  <div><p className="text-xs text-muted-foreground">Room Type</p><p className="font-semibold capitalize">{selectedRoom.roomType || 'Classroom'}</p></div>
                  <div><p className="text-xs text-muted-foreground">Exam</p><p className="font-semibold truncate">{selectedRoom.sessionName}</p></div>
                  <div><p className="text-xs text-muted-foreground">Timing</p><p className="font-semibold">{selectedRoom.startTime} - {selectedRoom.endTime}</p></div>
                </div>
                <Card className="border-none shadow-sm bg-muted/40">
                  <CardContent className="p-4 text-sm space-y-1">
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Assigned Faculty</p>
                    <p className="font-medium">{selectedRoom.assignedFacultyName || 'Unassigned'}</p>
                    <p className="text-xs text-muted-foreground">{selectedRoom.facultyDepartment} · {selectedRoom.facultyEmail}</p>
                  </CardContent>
                </Card>
                <div>
                  <p className="text-xs text-muted-foreground">Attendance Submitted</p>
                  <p className="font-medium">{selectedRoom.attendanceSubmitted ? 'Yes' : 'Pending'}</p>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Conflict Dialog */}
      <Dialog open={conflictOpen} onOpenChange={setConflictOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Conflict Report</DialogTitle>
            <DialogDescription>Automatic checks across all invigilation assignments.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {[
              { title: 'Double-booked Faculty (same slot)', rows: conflicts.doubleBooked },
              { title: 'Duplicate Room Assignments', rows: conflicts.dupeRoom },
            ].map((sec, idx) => (
              <div key={idx}>
                <p className="text-sm font-semibold mb-2">{sec.title} ({sec.rows.length})</p>
                {sec.rows.length === 0 ? <p className="text-xs text-muted-foreground">No conflicts.</p> : (
                  <div className="space-y-2">
                    {sec.rows.map((grp, gi) => (
                      <div key={gi} className="p-2 rounded border text-xs bg-red-500/5 border-red-500/20">
                        {grp.map(d => <div key={d.id}>{d.assignedFacultyName} · {d.date} {d.slot} · Room {d.roomNumber} (Block {d.blockNumber})</div>)}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <div>
              <p className="text-sm font-semibold mb-2">Overloaded Faculty (&gt; 10 duties) ({conflicts.overloaded.length})</p>
              {conflicts.overloaded.length === 0 ? <p className="text-xs text-muted-foreground">None.</p> : (
                <div className="space-y-1 text-xs">
                  {conflicts.overloaded.map(([fid, arr]) => (
                    <div key={fid}>{arr[0].assignedFacultyName} — {arr.length} duties</div>
                  ))}
                </div>
              )}
            </div>
            <div>
              <p className="text-sm font-semibold mb-2">Unassigned Rooms ({conflicts.unassigned.length})</p>
              {conflicts.unassigned.length === 0 ? <p className="text-xs text-muted-foreground">All rooms covered.</p> : (
                <div className="space-y-1 text-xs">
                  {conflicts.unassigned.slice(0, 20).map(d => (
                    <div key={d.id}>{d.date} · {d.slot} · Block {d.blockNumber} · Room {d.roomNumber}</div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter><Button onClick={() => setConflictOpen(false)}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Replace Faculty Dialog */}
      <Dialog open={!!replaceOpen} onOpenChange={o => !o && setReplaceOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Replace Faculty</DialogTitle>
            <DialogDescription>
              Reassign Room {replaceOpen?.roomNumber} on {replaceOpen?.date} ({replaceOpen?.slot}).
            </DialogDescription>
          </DialogHeader>
          <Select value={replaceFacultyId} onValueChange={setReplaceFacultyId}>
            <SelectTrigger><SelectValue placeholder="Select replacement faculty" /></SelectTrigger>
            <SelectContent>
              {faculty.filter(f => f.id !== replaceOpen?.assignedFacultyId).map(f => (
                <SelectItem key={f.id} value={f.id}>{f.name} · {f.branchId || f.branch || 'General'}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReplaceOpen(null)}>Cancel</Button>
            <Button onClick={handleReplace} disabled={!replaceFacultyId}>Confirm Replacement</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
