import React, { useState, useEffect, useMemo } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import {
  Users, UserCheck, UserX, Percent, Clock, AlertTriangle, FileCheck2, FileClock,
  Search, Filter, Download, Printer, FileSpreadsheet, FileText, Eye, RefreshCw, BarChart3,
  BadgeCheck
} from 'lucide-react';
import {
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend,
  LineChart, Line, CartesianGrid,
} from 'recharts';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, deleteDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface AttRecord {
  rollNumber: string;
  name: string;
  branch: string;
  year?: string;
  status: 'Present' | 'Absent' | 'Late' | 'Malpractice';
  remarks?: string;
  seat?: string;
}
interface AttendanceDoc {
  id: string;
  institutionId: string;
  sessionId?: string;
  sessionName?: string;
  date: string;
  slot: string;
  roomNumber: string;
  blockNumber: string;
  subjectCode?: string;
  subjectName?: string;
  facultyId?: string;
  facultyName?: string;
  presentCount: number;
  absentCount: number;
  malpracticeCount: number;
  lateCount: number;
  totalStudents: number;
  records: AttRecord[];
  timestamp?: any;
}
interface InvigilationDoc {
  id: string;
  institutionId: string;
  sessionId?: string;
  sessionName?: string;
  date: string;
  slot: string;
  roomNumber: string;
  blockNumber: string;
  subjectCode?: string;
  subjectName?: string;
  assignedFacultyId?: string;
  assignedFacultyName?: string;
  status?: string;
  attendanceSubmitted?: boolean;
}

const KPICard: React.FC<{ label: string; value: string | number; icon: React.ReactNode; accent: string; sub?: string }>
= ({ label, value, icon, accent, sub }) => (
  <Card className="border-none shadow-sm">
    <CardContent className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="text-2xl font-display font-bold text-foreground mt-1 truncate">{value}</p>
          {sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}
        </div>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${accent}`}>
          {icon}
        </div>
      </div>
    </CardContent>
  </Card>
);

const STATUS_COLORS: Record<string, string> = {
  Present: '#10b981',
  Absent: '#ef4444',
  Late: '#f59e0b',
  Malpractice: '#8b5cf6',
  Pending: '#94a3b8',
};

export default function AdminAttendanceReports() {
  const { user, college } = useAuth();
  const institutionId = (user as any)?.institutionId || (user as any)?.collegeId || college?.id || '';

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [attendance, setAttendance] = useState<AttendanceDoc[]>([]);
  const [invigilations, setInvigilations] = useState<InvigilationDoc[]>([]);

  const [filters, setFilters] = useState({
    exam: 'all', date: 'all', slot: 'all', branch: 'all', subject: 'all',
    room: 'all', block: 'all', faculty: 'all', status: 'all',
  });
  const [search, setSearch] = useState('');
  const [selectedRoom, setSelectedRoom] = useState<AttendanceDoc | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<{ rec: AttRecord; parent: AttendanceDoc } | null>(null);
  const [tab, setTab] = useState('overview');

  const loadData = async () => {
    if (!institutionId) { setLoading(false); return; }
    try {
      setRefreshing(true);
      const [attSnap, invSnap] = await Promise.all([
        getDocs(query(collection(db, 'attendance'), where('institutionId', '==', institutionId))),
        getDocs(query(collection(db, 'invigilations'), where('institutionId', '==', institutionId))),
      ]);
      const att = attSnap.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceDoc));
      att.sort((a, b) => {
        const tA = a.timestamp?.toMillis ? a.timestamp.toMillis() : 0;
        const tB = b.timestamp?.toMillis ? b.timestamp.toMillis() : 0;
        return tB - tA;
      });
      setAttendance(att);
      setInvigilations(invSnap.docs.map(d => ({ id: d.id, ...d.data() } as InvigilationDoc)));
    } catch (err) {
      console.error(err);
      toast.error('Failed to load attendance data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadData(); /* eslint-disable-next-line */ }, [institutionId]);

  // Filter option lists
  const opts = useMemo(() => {
    const uniq = (arr: (string | undefined)[]) => Array.from(new Set(arr.filter(Boolean))) as string[];
    return {
      exams: uniq(attendance.map(a => a.sessionName)),
      dates: uniq(attendance.map(a => a.date)).sort().reverse(),
      slots: uniq(attendance.map(a => a.slot)),
      branches: uniq(attendance.flatMap(a => a.records?.map(r => r.branch) || [])),
      subjects: uniq(attendance.map(a => a.subjectCode ? `${a.subjectCode} — ${a.subjectName || ''}` : '')),
      rooms: uniq(attendance.map(a => a.roomNumber)),
      blocks: uniq(attendance.map(a => a.blockNumber)),
      faculty: uniq(attendance.map(a => a.facultyName)),
    };
  }, [attendance]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return attendance.filter(a => {
      if (filters.exam !== 'all' && a.sessionName !== filters.exam) return false;
      if (filters.date !== 'all' && a.date !== filters.date) return false;
      if (filters.slot !== 'all' && a.slot !== filters.slot) return false;
      if (filters.subject !== 'all' && `${a.subjectCode} — ${a.subjectName || ''}` !== filters.subject) return false;
      if (filters.room !== 'all' && a.roomNumber !== filters.room) return false;
      if (filters.block !== 'all' && a.blockNumber !== filters.block) return false;
      if (filters.faculty !== 'all' && a.facultyName !== filters.faculty) return false;
      if (filters.branch !== 'all' && !(a.records || []).some(r => r.branch === filters.branch)) return false;
      if (filters.status !== 'all') {
        const hasStatus = (a.records || []).some(r => r.status === filters.status);
        if (!hasStatus) return false;
      }
      if (q) {
        const hay = [
          a.sessionName, a.subjectCode, a.subjectName, a.facultyName, a.roomNumber, a.blockNumber, a.date,
          ...(a.records || []).flatMap(r => [r.name, r.rollNumber, r.branch]),
        ].filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [attendance, filters, search]);

  // KPIs
  const kpis = useMemo(() => {
    const scheduled = filtered.reduce((s, a) => s + (a.totalStudents || 0), 0);
    const present = filtered.reduce((s, a) => s + (a.presentCount || 0), 0);
    const absent = filtered.reduce((s, a) => s + (a.absentCount || 0), 0);
    const late = filtered.reduce((s, a) => s + (a.lateCount || 0), 0);
    const malpractice = filtered.reduce((s, a) => s + (a.malpracticeCount || 0), 0);
    const pct = scheduled ? (present / scheduled) * 100 : 0;

    // Faculty submissions across ALL invigilations (unfiltered institutional view)
    const submittedInv = invigilations.filter(i => i.attendanceSubmitted || i.status === 'completed').length;
    const pendingInv = invigilations.length - submittedInv;
    return { scheduled, present, absent, late, malpractice, pct, submittedInv, pendingInv };
  }, [filtered, invigilations]);

  // Analytics groupings
  const analytics = useMemo(() => {
    const branchAgg: Record<string, { p: number; a: number; l: number; m: number; total: number }> = {};
    const yearAgg: Record<string, { p: number; a: number; total: number }> = {};
    const subjectAgg: Record<string, { p: number; total: number }> = {};
    filtered.forEach(a => {
      (a.records || []).forEach(r => {
        const b = r.branch || 'N/A';
        branchAgg[b] ||= { p: 0, a: 0, l: 0, m: 0, total: 0 };
        branchAgg[b].total++;
        if (r.status === 'Present' || r.status === 'Late') branchAgg[b].p++;
        if (r.status === 'Absent') branchAgg[b].a++;
        if (r.status === 'Late') branchAgg[b].l++;
        if (r.status === 'Malpractice') branchAgg[b].m++;

        const y = r.year || 'N/A';
        yearAgg[y] ||= { p: 0, a: 0, total: 0 };
        yearAgg[y].total++;
        if (r.status === 'Present' || r.status === 'Late') yearAgg[y].p++;
        if (r.status === 'Absent') yearAgg[y].a++;
      });
      const subj = a.subjectCode || a.subjectName || 'N/A';
      subjectAgg[subj] ||= { p: 0, total: 0 };
      subjectAgg[subj].p += a.presentCount + a.lateCount;
      subjectAgg[subj].total += a.totalStudents;
    });

    const facultyTimeline: { time: string; count: number }[] = [];
    const byHour: Record<string, number> = {};
    filtered.forEach(a => {
      const t = a.timestamp?.toDate ? a.timestamp.toDate() : null;
      if (t) {
        const key = t.toISOString().slice(0, 10);
        byHour[key] = (byHour[key] || 0) + 1;
      }
    });
    Object.entries(byHour).sort(([x], [y]) => x.localeCompare(y)).forEach(([time, count]) => facultyTimeline.push({ time, count }));

    return {
      branch: Object.entries(branchAgg).map(([name, v]) => ({
        name, present: v.p, absent: v.a, pct: v.total ? Math.round((v.p / v.total) * 100) : 0, malpractice: v.m,
      })),
      year: Object.entries(yearAgg).map(([name, v]) => ({ name, present: v.p, absent: v.a })),
      subject: Object.entries(subjectAgg).map(([name, v]) => ({ name, pct: v.total ? Math.round((v.p / v.total) * 100) : 0 })),
      facultyTimeline,
    };
  }, [filtered]);

  // Faculty submission tracker
  const facultyTracker = useMemo(() => {
    return invigilations.map(inv => {
      const match = attendance.find(a =>
        a.sessionId === inv.sessionId && a.date === inv.date && a.slot === inv.slot && a.roomNumber === inv.roomNumber
      );
      let status: 'Submitted' | 'Pending' | 'Late Submission' = 'Pending';
      let submittedAt = '';
      if (match) {
        status = 'Submitted';
        submittedAt = match.timestamp?.toDate ? match.timestamp.toDate().toLocaleString() : '';
      }
      return {
        id: inv.id,
        facultyName: inv.assignedFacultyName || 'Unassigned',
        room: inv.roomNumber,
        block: inv.blockNumber,
        exam: inv.sessionName || '—',
        date: inv.date,
        slot: inv.slot,
        submittedAt,
        status,
      };
    });
  }, [invigilations, attendance]);

  const resetFilters = () => setFilters({ exam: 'all', date: 'all', slot: 'all', branch: 'all', subject: 'all', room: 'all', block: 'all', faculty: 'all', status: 'all' });

  // Exports
  const exportRows = () => filtered.map(a => ({
    'Attendance ID': a.id,
    'Exam': a.sessionName || '',
    'Subject': `${a.subjectCode || ''} ${a.subjectName || ''}`.trim(),
    'Date': a.date,
    'Slot': a.slot,
    'Block': a.blockNumber,
    'Room': a.roomNumber,
    'Faculty': a.facultyName || '',
    'Scheduled': a.totalStudents,
    'Present': a.presentCount,
    'Absent': a.absentCount,
    'Late': a.lateCount,
    'Malpractice': a.malpracticeCount,
    'Attendance %': a.totalStudents ? Math.round(((a.presentCount + a.lateCount) / a.totalStudents) * 100) : 0,
  }));

  const doExport = (kind: 'excel' | 'csv' | 'pdf' | 'print') => {
    const rows = exportRows();
    if (!rows.length) { toast.warning('No data to export'); return; }
    if (kind === 'excel' || kind === 'csv') {
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, 'Attendance');
      XLSX.writeFile(wb, `attendance_report.${kind === 'excel' ? 'xlsx' : 'csv'}`);
      toast.success(`Exported ${rows.length} rows`);
    } else if (kind === 'pdf') {
      const pdf = new jsPDF({ orientation: 'landscape' });
      pdf.setFontSize(14);
      pdf.text('Attendance Report — ' + (college?.name || ''), 14, 14);
      autoTable(pdf, {
        head: [Object.keys(rows[0])],
        body: rows.map(r => Object.values(r).map(v => String(v))),
        startY: 20,
        styles: { fontSize: 7 },
        headStyles: { fillColor: [30, 41, 59] },
      });
      pdf.save('attendance_report.pdf');
    } else if (kind === 'print') {
      window.print();
    }
  };

  const reopenReport = async (a: AttendanceDoc) => {
    if (!confirm('Reopen this attendance report? Faculty will be able to resubmit.')) return;
    try {
      const invMatch = invigilations.find(i => i.sessionId === a.sessionId && i.date === a.date && i.slot === a.slot && i.roomNumber === a.roomNumber);
      if (invMatch) {
        await updateDoc(doc(db, 'invigilations', invMatch.id), { attendanceSubmitted: false, status: 'assigned', updatedAt: serverTimestamp() });
      }
      await deleteDoc(doc(db, 'attendance', a.id));
      toast.success('Report reopened');
      loadData();
    } catch (e) {
      toast.error('Failed to reopen report');
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-[1600px] mx-auto space-y-6 animate-fade-in pb-12">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <div className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
              <span>Admin</span><span>/</span><span>Operations</span><span>/</span>
              <span className="text-foreground font-medium">Attendance Reports</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground mb-1">Examination Attendance Management</h1>
            <p className="text-muted-foreground text-sm">Centralised attendance monitoring across all examination halls, rooms, faculty and branches.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={loadData} disabled={refreshing}>
              <RefreshCw className={`w-4 h-4 mr-1.5 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={() => doExport('excel')}><FileSpreadsheet className="w-4 h-4 mr-1.5" />Excel</Button>
            <Button variant="outline" size="sm" onClick={() => doExport('csv')}><FileText className="w-4 h-4 mr-1.5" />CSV</Button>
            <Button variant="outline" size="sm" onClick={() => doExport('pdf')}><Download className="w-4 h-4 mr-1.5" />PDF</Button>
            <Button variant="outline" size="sm" onClick={() => doExport('print')}><Printer className="w-4 h-4 mr-1.5" />Print</Button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
          {loading ? Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-24" />) : (
            <>
              <KPICard label="Scheduled" value={kpis.scheduled} icon={<Users className="w-5 h-5 text-blue-600" />} accent="bg-blue-50" />
              <KPICard label="Present" value={kpis.present} icon={<UserCheck className="w-5 h-5 text-emerald-600" />} accent="bg-emerald-50" />
              <KPICard label="Absent" value={kpis.absent} icon={<UserX className="w-5 h-5 text-red-600" />} accent="bg-red-50" />
              <KPICard label="Attendance %" value={`${kpis.pct.toFixed(1)}%`} icon={<Percent className="w-5 h-5 text-indigo-600" />} accent="bg-indigo-50" />
              <KPICard label="Late Entries" value={kpis.late} icon={<Clock className="w-5 h-5 text-amber-600" />} accent="bg-amber-50" />
              <KPICard label="Malpractice" value={kpis.malpractice} icon={<AlertTriangle className="w-5 h-5 text-purple-600" />} accent="bg-purple-50" />
              <KPICard label="Reports Submitted" value={kpis.submittedInv} icon={<FileCheck2 className="w-5 h-5 text-teal-600" />} accent="bg-teal-50" />
              <KPICard label="Pending Reports" value={kpis.pendingInv} icon={<FileClock className="w-5 h-5 text-slate-600" />} accent="bg-slate-100" />
            </>
          )}
        </div>

        {/* Filters */}
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><Filter className="w-4 h-4" /> Filters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {[
                { k: 'exam', label: 'Exam', opts: opts.exams },
                { k: 'date', label: 'Date', opts: opts.dates },
                { k: 'slot', label: 'Session', opts: opts.slots },
                { k: 'branch', label: 'Branch', opts: opts.branches },
                { k: 'subject', label: 'Subject', opts: opts.subjects },
                { k: 'room', label: 'Room', opts: opts.rooms },
                { k: 'block', label: 'Block', opts: opts.blocks },
                { k: 'faculty', label: 'Faculty', opts: opts.faculty },
                { k: 'status', label: 'Status', opts: ['Present', 'Absent', 'Late', 'Malpractice'] },
              ].map(f => (
                <Select key={f.k} value={(filters as any)[f.k]} onValueChange={v => setFilters(p => ({ ...p, [f.k]: v }))}>
                  <SelectTrigger className="h-9"><SelectValue placeholder={f.label} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{`All ${f.label}s`}</SelectItem>
                    {f.opts.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              ))}
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search by student name, roll number, faculty, subject, room..." className="pl-9 h-9" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <Button variant="ghost" size="sm" onClick={resetFilters}>Reset</Button>
            </div>
          </CardContent>
        </Card>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="overview">Report Grid</TabsTrigger>
            <TabsTrigger value="analytics"><BarChart3 className="w-3.5 h-3.5 mr-1" />AI Analytics</TabsTrigger>
            <TabsTrigger value="faculty">Faculty Submissions</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4">
            <Card className="border-none shadow-sm">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-muted/40 sticky top-0">
                      <TableRow>
                        <TableHead>Attendance ID</TableHead>
                        <TableHead>Exam / Subject</TableHead>
                        <TableHead>Date & Slot</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Faculty</TableHead>
                        <TableHead className="text-center">Sched</TableHead>
                        <TableHead className="text-center">P</TableHead>
                        <TableHead className="text-center">A</TableHead>
                        <TableHead className="text-center">L</TableHead>
                        <TableHead className="text-center">M</TableHead>
                        <TableHead>Attendance %</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}><TableCell colSpan={12}><Skeleton className="h-6 w-full" /></TableCell></TableRow>
                      )) : filtered.length === 0 ? (
                        <TableRow><TableCell colSpan={12} className="text-center py-12 text-muted-foreground">No attendance reports match the selected filters.</TableCell></TableRow>
                      ) : filtered.map(a => {
                        const pct = a.totalStudents ? Math.round(((a.presentCount + a.lateCount) / a.totalStudents) * 100) : 0;
                        return (
                          <TableRow key={a.id} className="hover:bg-muted/10">
                            <TableCell className="font-mono text-[10px] text-muted-foreground">{a.id.slice(0, 8)}</TableCell>
                            <TableCell>
                              <p className="font-semibold text-sm">{a.sessionName || '—'}</p>
                              <p className="text-xs text-muted-foreground">{a.subjectCode} {a.subjectName && `— ${a.subjectName}`}</p>
                            </TableCell>
                            <TableCell>
                              <p className="text-sm">{a.date}</p>
                              <Badge variant="outline" className="text-[10px] uppercase mt-0.5">{a.slot}</Badge>
                            </TableCell>
                            <TableCell>
                              <p className="text-sm font-semibold">Room {a.roomNumber}</p>
                              <p className="text-xs text-muted-foreground">Block {a.blockNumber}</p>
                            </TableCell>
                            <TableCell className="text-sm">{a.facultyName || '—'}</TableCell>
                            <TableCell className="text-center font-medium">{a.totalStudents}</TableCell>
                            <TableCell className="text-center font-bold text-emerald-600">{a.presentCount}</TableCell>
                            <TableCell className="text-center font-bold text-red-600">{a.absentCount}</TableCell>
                            <TableCell className="text-center font-bold text-amber-600">{a.lateCount}</TableCell>
                            <TableCell className="text-center font-bold text-purple-600">{a.malpracticeCount}</TableCell>
                            <TableCell className="w-32">
                              <div className="flex items-center gap-2">
                                <Progress value={pct} className="h-2" />
                                <span className="text-xs font-semibold w-10 text-right">{pct}%</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right space-x-1">
                              <Button variant="outline" size="sm" onClick={() => setSelectedRoom(a)}><Eye className="w-3.5 h-3.5" /></Button>
                              <Button variant="ghost" size="sm" onClick={() => reopenReport(a)} className="text-red-600 hover:text-red-700">Reopen</Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card className="border-none shadow-sm">
                <CardHeader><CardTitle className="text-base">Present vs Absent</CardTitle></CardHeader>
                <CardContent className="h-64">
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={[
                        { name: 'Present', value: kpis.present },
                        { name: 'Absent', value: kpis.absent },
                        { name: 'Late', value: kpis.late },
                        { name: 'Malpractice', value: kpis.malpractice },
                      ]} dataKey="value" innerRadius={50} outerRadius={90} paddingAngle={2}>
                        {['Present', 'Absent', 'Late', 'Malpractice'].map(k => <Cell key={k} fill={STATUS_COLORS[k]} />)}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm">
                <CardHeader><CardTitle className="text-base">Branch-wise Attendance %</CardTitle></CardHeader>
                <CardContent className="h-64">
                  <ResponsiveContainer>
                    <BarChart data={analytics.branch}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey="name" fontSize={11} />
                      <YAxis fontSize={11} />
                      <Tooltip />
                      <Bar dataKey="pct" fill="#3b82f6" name="Attendance %" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm">
                <CardHeader><CardTitle className="text-base">Year-wise Present vs Absent</CardTitle></CardHeader>
                <CardContent className="h-64">
                  <ResponsiveContainer>
                    <BarChart data={analytics.year}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey="name" fontSize={11} />
                      <YAxis fontSize={11} />
                      <Tooltip /><Legend />
                      <Bar dataKey="present" fill="#10b981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="absent" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm">
                <CardHeader><CardTitle className="text-base">Faculty Submission Timeline</CardTitle></CardHeader>
                <CardContent className="h-64">
                  <ResponsiveContainer>
                    <LineChart data={analytics.facultyTimeline}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey="time" fontSize={11} />
                      <YAxis fontSize={11} />
                      <Tooltip />
                      <Line type="monotone" dataKey="count" stroke="#8b5cf6" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm lg:col-span-2">
                <CardHeader><CardTitle className="text-base">Malpractice Distribution by Branch</CardTitle></CardHeader>
                <CardContent className="h-64">
                  <ResponsiveContainer>
                    <BarChart data={analytics.branch}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey="name" fontSize={11} />
                      <YAxis fontSize={11} />
                      <Tooltip />
                      <Bar dataKey="malpractice" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="faculty" className="mt-4">
            <Card className="border-none shadow-sm">
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-muted/40">
                    <TableRow>
                      <TableHead>Faculty</TableHead>
                      <TableHead>Room / Block</TableHead>
                      <TableHead>Exam</TableHead>
                      <TableHead>Date & Slot</TableHead>
                      <TableHead>Submitted At</TableHead>
                      <TableHead className="text-right">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {facultyTracker.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">No invigilation duties assigned yet.</TableCell></TableRow>
                    ) : facultyTracker.map(f => (
                      <TableRow key={f.id}>
                        <TableCell className="font-medium">{f.facultyName}</TableCell>
                        <TableCell><span className="font-semibold">Room {f.room}</span> <span className="text-xs text-muted-foreground">/ Block {f.block}</span></TableCell>
                        <TableCell>{f.exam}</TableCell>
                        <TableCell>{f.date} <Badge variant="outline" className="ml-1 text-[10px]">{f.slot}</Badge></TableCell>
                        <TableCell className="text-sm text-muted-foreground">{f.submittedAt || '—'}</TableCell>
                        <TableCell className="text-right">
                          <Badge className={
                            f.status === 'Submitted' ? 'bg-emerald-100 text-emerald-800' :
                            (f.status as string) === 'Late Submission' ? 'bg-amber-100 text-amber-800' :
                            'bg-slate-200 text-slate-700'
                          }>{f.status}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Room Detail Drawer */}
      <Sheet open={!!selectedRoom} onOpenChange={(o) => !o && setSelectedRoom(null)}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2"><BadgeCheck className="w-5 h-5 text-emerald-600" /> Room Attendance Detail</SheetTitle>
            <SheetDescription>
              {selectedRoom && (
                <>Room {selectedRoom.roomNumber} · Block {selectedRoom.blockNumber} · {selectedRoom.date} ({selectedRoom.slot})</>
              )}
            </SheetDescription>
          </SheetHeader>
          {selectedRoom && (
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">Exam:</span> <span className="font-semibold">{selectedRoom.sessionName}</span></div>
                <div><span className="text-muted-foreground">Subject:</span> <span className="font-semibold">{selectedRoom.subjectCode} {selectedRoom.subjectName}</span></div>
                <div><span className="text-muted-foreground">Faculty:</span> <span className="font-semibold">{selectedRoom.facultyName}</span></div>
                <div><span className="text-muted-foreground">Allocated:</span> <span className="font-semibold">{selectedRoom.totalStudents}</span></div>
              </div>
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-2"><p className="text-[10px] text-muted-foreground uppercase">Present</p><p className="font-bold text-emerald-700">{selectedRoom.presentCount}</p></div>
                <div className="bg-red-50 border border-red-100 rounded-lg p-2"><p className="text-[10px] text-muted-foreground uppercase">Absent</p><p className="font-bold text-red-700">{selectedRoom.absentCount}</p></div>
                <div className="bg-amber-50 border border-amber-100 rounded-lg p-2"><p className="text-[10px] text-muted-foreground uppercase">Late</p><p className="font-bold text-amber-700">{selectedRoom.lateCount}</p></div>
                <div className="bg-purple-50 border border-purple-100 rounded-lg p-2"><p className="text-[10px] text-muted-foreground uppercase">Malpractice</p><p className="font-bold text-purple-700">{selectedRoom.malpracticeCount}</p></div>
              </div>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow>
                      <TableHead>Roll</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Branch</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Remarks</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(selectedRoom.records || []).map((r, i) => (
                      <TableRow key={i} className="cursor-pointer hover:bg-muted/40" onClick={() => setSelectedStudent({ rec: r, parent: selectedRoom })}>
                        <TableCell className="font-mono text-xs">{r.rollNumber}</TableCell>
                        <TableCell>{r.name}</TableCell>
                        <TableCell>{r.branch}</TableCell>
                        <TableCell>
                          <Badge className={`text-[10px] ${
                            r.status === 'Present' ? 'bg-emerald-100 text-emerald-800' :
                            r.status === 'Absent' ? 'bg-red-100 text-red-800' :
                            r.status === 'Late' ? 'bg-amber-100 text-amber-800' :
                            'bg-purple-100 text-purple-800'}`}>{r.status}</Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{r.remarks || '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Student Detail */}
      <Dialog open={!!selectedStudent} onOpenChange={(o) => !o && setSelectedStudent(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Student Attendance Record</DialogTitle>
            <DialogDescription>Detailed attendance information for this student.</DialogDescription>
          </DialogHeader>
          {selectedStudent && (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Roll:</span><span className="font-mono font-semibold">{selectedStudent.rec.rollNumber}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Name:</span><span className="font-semibold">{selectedStudent.rec.name}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Branch:</span><span>{selectedStudent.rec.branch}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Year:</span><span>{selectedStudent.rec.year || '—'}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Exam:</span><span>{selectedStudent.parent.sessionName}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Subject:</span><span>{selectedStudent.parent.subjectCode} {selectedStudent.parent.subjectName}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Seat:</span><span className="font-mono">{selectedStudent.rec.seat || '—'}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Status:</span>
                <Badge className={`text-[10px] ${
                  selectedStudent.rec.status === 'Present' ? 'bg-emerald-100 text-emerald-800' :
                  selectedStudent.rec.status === 'Absent' ? 'bg-red-100 text-red-800' :
                  selectedStudent.rec.status === 'Late' ? 'bg-amber-100 text-amber-800' :
                  'bg-purple-100 text-purple-800'}`}>{selectedStudent.rec.status}</Badge>
              </div>
              <div className="flex justify-between"><span className="text-muted-foreground">Remarks:</span><span className="text-right max-w-[60%]">{selectedStudent.rec.remarks || '—'}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Faculty:</span><span>{selectedStudent.parent.facultyName}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Submitted:</span><span className="text-xs">{selectedStudent.parent.timestamp?.toDate ? selectedStudent.parent.timestamp.toDate().toLocaleString() : '—'}</span></div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
