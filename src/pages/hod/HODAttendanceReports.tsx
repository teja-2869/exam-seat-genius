import React, { useState, useEffect, useMemo } from 'react';
import { HODLayout } from '@/components/layout/HODLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Search, Users, UserCheck, UserX, Percent, AlertTriangle, Clock, Download, RefreshCw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

export default function HODAttendanceReports() {
  const { user, college } = useAuth();
  const hod = user as any;
  const institutionId = hod?.institutionId || hod?.collegeId || college?.id || '';
  const branch = hod?.branch || '';

  const [loading, setLoading] = useState(true);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [search, setSearch] = useState('');

  const load = async () => {
    if (!institutionId) { setLoading(false); return; }
    try {
      setLoading(true);
      const snap = await getDocs(query(collection(db, 'attendance'), where('institutionId', '==', institutionId)));
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      // Filter to only records that include this branch
      const scoped = all
        .map(a => ({ ...a, records: (a.records || []).filter((r: any) => !branch || r.branch === branch) }))
        .filter(a => a.records.length > 0);
      scoped.sort((a, b) => (b.timestamp?.toMillis?.() || 0) - (a.timestamp?.toMillis?.() || 0));
      setAttendance(scoped);
    } catch (e) {
      console.error(e); toast.error('Failed to load reports');
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [institutionId, branch]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return attendance;
    return attendance.filter(a => [
      a.sessionName, a.subjectCode, a.subjectName, a.roomNumber, a.date, a.facultyName,
      ...(a.records || []).flatMap((r: any) => [r.name, r.rollNumber])
    ].filter(Boolean).join(' ').toLowerCase().includes(q));
  }, [attendance, search]);

  const kpis = useMemo(() => {
    let scheduled = 0, present = 0, absent = 0, late = 0, mal = 0;
    filtered.forEach(a => (a.records || []).forEach((r: any) => {
      scheduled++;
      if (r.status === 'Present' || r.status === 'Late') present++;
      if (r.status === 'Absent') absent++;
      if (r.status === 'Late') late++;
      if (r.status === 'Malpractice') mal++;
    }));
    return { scheduled, present, absent, late, mal, pct: scheduled ? (present / scheduled) * 100 : 0 };
  }, [filtered]);

  const exportExcel = () => {
    const rows = filtered.flatMap(a => (a.records || []).map((r: any) => ({
      Exam: a.sessionName, Subject: `${a.subjectCode || ''} ${a.subjectName || ''}`.trim(),
      Date: a.date, Slot: a.slot, Room: a.roomNumber, Block: a.blockNumber,
      Roll: r.rollNumber, Name: r.name, Branch: r.branch, Status: r.status, Remarks: r.remarks || ''
    })));
    if (!rows.length) return toast.warning('Nothing to export');
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Attendance');
    XLSX.writeFile(wb, `${branch || 'department'}_attendance.xlsx`);
  };

  return (
    <HODLayout>
      <div className="max-w-7xl mx-auto space-y-6 animate-fade-in pb-12">
        <div className="flex justify-between items-end gap-4 flex-wrap">
          <div>
            <div className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
              <span>HOD</span><span>/</span><span>Reports</span><span>/</span><span className="text-foreground font-medium">Attendance Reports</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground mb-1">Department Attendance Reports</h1>
            <p className="text-muted-foreground text-sm">Exam attendance for <strong>{branch || 'your department'}</strong> students.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={load}><RefreshCw className="w-4 h-4 mr-1.5" />Refresh</Button>
            <Button variant="outline" size="sm" onClick={exportExcel}><Download className="w-4 h-4 mr-1.5" />Export</Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          {loading ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24" />) : ([
            { label: 'Scheduled', v: kpis.scheduled, icon: <Users className="w-5 h-5 text-blue-600" />, bg: 'bg-blue-50' },
            { label: 'Present', v: kpis.present, icon: <UserCheck className="w-5 h-5 text-emerald-600" />, bg: 'bg-emerald-50' },
            { label: 'Absent', v: kpis.absent, icon: <UserX className="w-5 h-5 text-red-600" />, bg: 'bg-red-50' },
            { label: 'Attendance %', v: `${kpis.pct.toFixed(1)}%`, icon: <Percent className="w-5 h-5 text-indigo-600" />, bg: 'bg-indigo-50' },
            { label: 'Late', v: kpis.late, icon: <Clock className="w-5 h-5 text-amber-600" />, bg: 'bg-amber-50' },
            { label: 'Malpractice', v: kpis.mal, icon: <AlertTriangle className="w-5 h-5 text-purple-600" />, bg: 'bg-purple-50' },
          ].map(k => (
            <Card key={k.label} className="border-none shadow-sm"><CardContent className="p-4 flex justify-between items-start">
              <div><p className="text-[11px] uppercase tracking-wider text-muted-foreground">{k.label}</p><p className="text-2xl font-bold mt-1">{k.v}</p></div>
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${k.bg}`}>{k.icon}</div>
            </CardContent></Card>
          )))}
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search by exam, subject, room, student..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        <Card className="border-none shadow-sm"><CardHeader className="pb-3"><CardTitle className="text-base">Attendance Records</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead>Exam / Subject</TableHead>
                  <TableHead>Date & Slot</TableHead>
                  <TableHead>Room</TableHead>
                  <TableHead>Faculty</TableHead>
                  <TableHead className="text-center">Dept. Students</TableHead>
                  <TableHead className="text-center">P/A/L/M</TableHead>
                  <TableHead>Attendance %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? <TableRow><TableCell colSpan={7}><Skeleton className="h-6 w-full" /></TableCell></TableRow>
                : filtered.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">No department attendance records.</TableCell></TableRow>
                : filtered.map(a => {
                  const total = a.records.length;
                  const p = a.records.filter((r: any) => r.status === 'Present' || r.status === 'Late').length;
                  const abs = a.records.filter((r: any) => r.status === 'Absent').length;
                  const late = a.records.filter((r: any) => r.status === 'Late').length;
                  const mal = a.records.filter((r: any) => r.status === 'Malpractice').length;
                  const pct = total ? Math.round((p / total) * 100) : 0;
                  return (
                    <TableRow key={a.id}>
                      <TableCell><p className="font-semibold text-sm">{a.sessionName}</p><p className="text-xs text-muted-foreground">{a.subjectCode} — {a.subjectName}</p></TableCell>
                      <TableCell>{a.date} <Badge variant="outline" className="text-[10px] ml-1">{a.slot}</Badge></TableCell>
                      <TableCell><p className="text-sm font-semibold">Room {a.roomNumber}</p><p className="text-xs text-muted-foreground">Block {a.blockNumber}</p></TableCell>
                      <TableCell className="text-sm">{a.facultyName}</TableCell>
                      <TableCell className="text-center font-medium">{total}</TableCell>
                      <TableCell className="text-center text-xs">
                        <span className="text-emerald-600 font-bold">{p}</span>/
                        <span className="text-red-600 font-bold">{abs}</span>/
                        <span className="text-amber-600 font-bold">{late}</span>/
                        <span className="text-purple-600 font-bold">{mal}</span>
                      </TableCell>
                      <TableCell className="w-40"><div className="flex items-center gap-2"><Progress value={pct} className="h-2" /><span className="text-xs font-semibold w-10 text-right">{pct}%</span></div></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </HODLayout>
  );
}
