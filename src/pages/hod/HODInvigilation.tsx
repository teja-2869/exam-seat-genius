import React, { useState, useEffect, useMemo } from 'react';
import { HODLayout } from '@/components/layout/HODLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Users, UserCheck, RefreshCw, Download, FileSpreadsheet, ClipboardList } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import * as XLSX from 'xlsx';

interface Duty {
  id: string; date: string; slot: string;
  roomNumber: string; blockNumber: string; floorNumber?: string | number;
  assignedFacultyId?: string; assignedFacultyName?: string; assignedFacultyIdCard?: string;
  facultyDepartment?: string; sessionName?: string; startTime?: string; endTime?: string;
  status?: string;
}

const statusColor: Record<string, string> = {
  upcoming: 'bg-blue-500/15 text-blue-700 dark:text-blue-300',
  completed: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  absent: 'bg-red-500/15 text-red-700 dark:text-red-300',
};

export default function HODInvigilation() {
  const { user, college } = useAuth();
  const u = user as any;
  const institutionId = u?.institutionId || u?.collegeId || college?.id || '';
  const branch = String(u?.branch || u?.branchId || '').trim().toLowerCase();

  const [loading, setLoading] = useState(true);
  const [duties, setDuties] = useState<Duty[]>([]);
  const [filters, setFilters] = useState({ date: 'all', slot: 'all', status: 'all' });
  const [search, setSearch] = useState('');

  const load = async () => {
    if (!institutionId) { setLoading(false); return; }
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, 'invigilations'), where('institutionId', '==', institutionId)));
      const all = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) } as Duty));
      // scope to department (faculty from the HOD's branch)
      const scoped = all.filter(d => String(d.facultyDepartment || '').trim().toLowerCase() === branch);
      scoped.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
      setDuties(scoped);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [institutionId, branch]);

  const opts = useMemo(() => {
    const uniq = (arr: any[]) => Array.from(new Set(arr.filter(Boolean).map(String)));
    return {
      dates: uniq(duties.map(d => d.date)),
      slots: uniq(duties.map(d => d.slot)),
      statuses: uniq(duties.map(d => d.status)),
    };
  }, [duties]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return duties.filter(d => {
      if (filters.date !== 'all' && d.date !== filters.date) return false;
      if (filters.slot !== 'all' && d.slot !== filters.slot) return false;
      if (filters.status !== 'all' && d.status !== filters.status) return false;
      if (q) {
        const hay = [d.assignedFacultyName, d.assignedFacultyIdCard, d.roomNumber, d.blockNumber, d.sessionName].filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [duties, filters, search]);

  const kpis = {
    total: duties.length,
    facultyCount: new Set(duties.map(d => d.assignedFacultyId).filter(Boolean)).size,
    completed: duties.filter(d => d.status === 'completed').length,
  };

  const exportExcel = () => {
    const rows = filtered.map(d => ({
      Faculty: d.assignedFacultyName, ID: d.assignedFacultyIdCard, Exam: d.sessionName,
      Date: d.date, Session: d.slot, Block: d.blockNumber, Floor: d.floorNumber, Room: d.roomNumber,
      Time: `${d.startTime || ''} - ${d.endTime || ''}`, Status: d.status,
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Department Duties');
    XLSX.writeFile(wb, `hod-invigilation-${Date.now()}.xlsx`);
  };

  return (
    <HODLayout>
      <div className="p-4 sm:p-6 space-y-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">HOD · Exams</p>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground mt-1">Department Invigilation Overview</h1>
            <p className="text-sm text-muted-foreground mt-1">Read-only view of invigilation duties for your department faculty.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={load}><RefreshCw className="w-4 h-4 mr-1.5" />Refresh</Button>
            <Button variant="outline" size="sm" onClick={exportExcel}><FileSpreadsheet className="w-4 h-4 mr-1.5" />Excel</Button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { l: 'Total Duties', v: kpis.total, i: <ClipboardList className="w-5 h-5 text-primary" />, a: 'bg-primary/10' },
            { l: 'Faculty Assigned', v: kpis.facultyCount, i: <Users className="w-5 h-5 text-cyan-600" />, a: 'bg-cyan-500/10' },
            { l: 'Completed', v: kpis.completed, i: <UserCheck className="w-5 h-5 text-emerald-600" />, a: 'bg-emerald-500/10' },
          ].map((k, i) => (
            <Card key={i} className="border-none shadow-sm"><CardContent className="p-4 flex items-start justify-between">
              <div><p className="text-[11px] uppercase tracking-wider text-muted-foreground">{k.l}</p><p className="text-2xl font-display font-bold mt-1">{k.v}</p></div>
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${k.a}`}>{k.i}</div>
            </CardContent></Card>
          ))}
        </div>

        <Card className="border-none shadow-sm">
          <CardContent className="p-4 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search faculty, room, exam..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Select value={filters.date} onValueChange={v => setFilters(p => ({ ...p, date: v }))}>
                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Date" /></SelectTrigger>
                <SelectContent><SelectItem value="all">All Dates</SelectItem>{opts.dates.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={filters.slot} onValueChange={v => setFilters(p => ({ ...p, slot: v }))}>
                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Session" /></SelectTrigger>
                <SelectContent><SelectItem value="all">All Sessions</SelectItem>{opts.slots.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={filters.status} onValueChange={v => setFilters(p => ({ ...p, status: v }))}>
                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent><SelectItem value="all">All Status</SelectItem>{opts.statuses.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-card">
                <TableRow>
                  <TableHead>Faculty</TableHead><TableHead>ID</TableHead>
                  <TableHead>Exam</TableHead><TableHead>Date</TableHead><TableHead>Session</TableHead>
                  <TableHead>Room</TableHead><TableHead>Time</TableHead><TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}><TableCell colSpan={8}><Skeleton className="h-6 w-full" /></TableCell></TableRow>
                )) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-10 text-sm text-muted-foreground">No duties for your department yet.</TableCell></TableRow>
                ) : filtered.map(d => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{d.assignedFacultyName}</TableCell>
                    <TableCell className="font-mono text-xs">{d.assignedFacultyIdCard}</TableCell>
                    <TableCell className="text-xs truncate max-w-[160px]">{d.sessionName}</TableCell>
                    <TableCell className="text-xs">{d.date}</TableCell>
                    <TableCell className="text-xs">{d.slot}</TableCell>
                    <TableCell className="text-xs">Block {d.blockNumber} · Room {d.roomNumber}</TableCell>
                    <TableCell className="text-xs">{d.startTime} - {d.endTime}</TableCell>
                    <TableCell><Badge variant="outline" className={statusColor[d.status || 'upcoming'] || ''}>{d.status || 'upcoming'}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </HODLayout>
  );
}
