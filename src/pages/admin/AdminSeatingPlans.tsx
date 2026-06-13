import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AdminLayout } from '@/components/layout/AdminLayout';
import {
  ClipboardList, LayoutGrid, Download, Filter, Search, Activity, Calendar,
  Monitor, MapPin, FileText, Users, Building2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from '@/hooks/use-toast';

/**
 * Build a row-major matrix of benches from the flat `seats` array stored in Firestore.
 * Falls back to the legacy `seatingMatrix` field for older documents.
 */
function buildMatrix(plan: any): any[][] {
  if (Array.isArray(plan?.seatingMatrix) && plan.seatingMatrix.length && Array.isArray(plan.seatingMatrix[0])) {
    return plan.seatingMatrix;
  }
  const rows = plan?.rows || 0;
  const cols = plan?.cols || 0;
  const isLab = plan?.roomType === 'lab';
  const matrix: any[][] = [];
  for (let r = 0; r < rows; r++) {
    const rowArr: any[] = [];
    for (let c = 0; c < cols; c++) rowArr.push({ row: r + 1, column: c + 1, seat1: null, seat2: null });
    matrix.push(rowArr);
  }
  (plan?.seats || []).forEach((s: any) => {
    const r = (s.row || 1) - 1;
    const c = (s.column || s.bench || 1) - 1;
    if (!matrix[r] || !matrix[r][c]) return;
    const seatData = {
      studentId: s.studentId, rollNumber: s.rollNumber, name: s.name,
      branch: s.branch, year: s.year,
      subjectCode: s.subjectCode, subjectName: s.subjectName, scheduleId: s.scheduleId,
    };
    if (isLab || s.seatPosition === 'single' || s.seatPosition === 'left') {
      matrix[r][c].seat1 = seatData;
    } else {
      matrix[r][c].seat2 = seatData;
    }
  });
  return matrix;
}

export default function AdminSeatingPlans() {
  const { user, college } = useAuth();
  const institutionId = college?.id || (user as any)?.institutionId;

  const [sessions, setSessions] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [fSession, setFSession] = useState('All');
  const [fDate, setFDate] = useState('All');
  const [fBlock, setFBlock] = useState('All');
  const [fFloor, setFFloor] = useState('All');
  const [fRoom, setFRoom] = useState('All');
  const [fBranch, setFBranch] = useState('All');
  const [fYear, setFYear] = useState('All');
  const [search, setSearch] = useState('');

  const [selectedRoom, setSelectedRoom] = useState<any | null>(null);

  useEffect(() => {
    if (!institutionId) return;
    const unsubS = onSnapshot(
      query(collection(db, 'examSessions'), where('institutionId', '==', institutionId)),
      snap => {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
        setSessions(data);
        if (fSession === 'All' && data.length > 0) setFSession(data[0].id);
      }
    );
    return () => unsubS();
  }, [institutionId]);

  useEffect(() => {
    if (!institutionId || fSession === 'All') { setPlans([]); setLoading(false); return; }
    setLoading(true);
    const unsub = onSnapshot(
      query(collection(db, 'seatingPlans'),
        where('institutionId', '==', institutionId),
        where('sessionId', '==', fSession)),
      snap => {
        setPlans(snap.docs.map(d => ({ id: d.id, ...d.data() } as any)));
        setLoading(false);
      }
    );
    return () => unsub();
  }, [institutionId, fSession]);

  const activeSession = sessions.find(s => s.id === fSession);

  const availableDates = useMemo(() => Array.from(new Set(plans.map(p => p.examDate))).sort(), [plans]);
  const availableBlocks = useMemo(() => Array.from(new Set(plans.map(p => p.blockNumber))).sort(), [plans]);
  const availableFloors = useMemo(() => Array.from(new Set(plans.filter(p => fBlock === 'All' || p.blockNumber === fBlock).map(p => p.floorNumber))).sort(), [plans, fBlock]);
  const availableRooms = useMemo(() => Array.from(new Set(plans.map(p => p.roomNumber))).sort(), [plans]);

  const filteredPlans = useMemo(() => plans.filter(p => {
    if (fDate !== 'All' && p.examDate !== fDate) return false;
    if (fBlock !== 'All' && p.blockNumber !== fBlock) return false;
    if (fFloor !== 'All' && String(p.floorNumber) !== String(fFloor)) return false;
    if (fRoom !== 'All' && p.roomNumber !== fRoom) return false;
    // search across seats
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      const hit = buildMatrix(p).flat().some((b: any) => {
        const s1 = b.seat1, s2 = b.seat2;
        const match = (s: any) => s && [s.rollNumber, s.name, s.branch].some(v => String(v || '').toLowerCase().includes(q));
        return match(s1) || match(s2) || String(p.roomNumber).toLowerCase().includes(q);
      });
      if (!hit) return false;
    }
    if (fBranch !== 'All' || fYear !== 'All') {
      const seats = buildMatrix(p).flat().flatMap((b: any) => [b.seat1, b.seat2]).filter(Boolean);
      if (fBranch !== 'All' && !seats.some((s: any) => s.branch === fBranch)) return false;
      if (fYear !== 'All' && !seats.some((s: any) => s.year === fYear)) return false;
    }
    return true;
  }), [plans, fDate, fBlock, fFloor, fRoom, fBranch, fYear, search]);

  // KPIs
  const totalSeats = filteredPlans.reduce((a, p) => a + (p.totalSeats || 0), 0);
  const totalOccupied = filteredPlans.reduce((a, p) => a + (p.occupiedSeats || 0), 0);

  /* ---------- PDF EXPORTS ---------- */
  const exportRoomWise = (plan: any) => {
    const pdf = new jsPDF();
    pdf.setFontSize(16); pdf.text(`Seating Plan — ${plan.roomNumber}`, 14, 16);
    pdf.setFontSize(10); pdf.text(`Block ${plan.blockNumber} • Floor ${plan.floorNumber} • ${plan.examDate} ${plan.examSlot}`, 14, 22);
    pdf.text(`Session: ${plan.sessionName || activeSession?.examName}`, 14, 27);
    const rows: any[] = [];
    buildMatrix(plan).forEach((row: any[]) => row.forEach((b: any) => {
      [b.seat1, b.seat2].filter(Boolean).forEach((s: any) => rows.push([
        `R${b.row}-C${b.column}`, s.rollNumber, s.name || '', s.branch || '', s.year || '', s.subjectCode || ''
      ]));
    }));
    autoTable(pdf, { startY: 32, head: [['Seat', 'Roll', 'Name', 'Branch', 'Year', 'Subject']], body: rows, styles: { fontSize: 8 } });
    pdf.save(`SeatingPlan_${plan.roomNumber}_${plan.examDate}.pdf`);
  };

  const exportBlockWise = (block: string) => {
    const pdf = new jsPDF();
    pdf.setFontSize(16); pdf.text(`Block ${block} — Seating Report`, 14, 16);
    pdf.setFontSize(10); pdf.text(`Session: ${activeSession?.examName}`, 14, 22);
    let y = 28;
    plans.filter(p => p.blockNumber === block).forEach(plan => {
      pdf.setFontSize(11);
      pdf.text(`Room ${plan.roomNumber} • Floor ${plan.floorNumber} • ${plan.examDate} ${plan.examSlot}`, 14, y); y += 4;
      const rows: any[] = [];
      buildMatrix(plan).forEach((row: any[]) => row.forEach((b: any) =>
        [b.seat1, b.seat2].filter(Boolean).forEach((s: any) => rows.push([
          `R${b.row}-C${b.column}`, s.rollNumber, s.branch || '', s.year || '', s.subjectCode || ''
        ]))));
      autoTable(pdf, { startY: y, head: [['Seat', 'Roll', 'Branch', 'Year', 'Subject']], body: rows, styles: { fontSize: 7 } });
      y = (pdf as any).lastAutoTable.finalY + 6;
      if (y > 270) { pdf.addPage(); y = 16; }
    });
    pdf.save(`Block_${block}_Seating.pdf`);
  };

  const exportStudentWise = () => {
    const pdf = new jsPDF();
    pdf.setFontSize(16); pdf.text('Student-wise Seating Report', 14, 16);
    pdf.setFontSize(10); pdf.text(`Session: ${activeSession?.examName}`, 14, 22);
    const rows: any[] = [];
    filteredPlans.forEach(p => buildMatrix(p).forEach((row: any[]) => row.forEach((b: any) =>
      [b.seat1, b.seat2].filter(Boolean).forEach((s: any) => rows.push([
        s.rollNumber, s.name || '', s.branch || '', s.year || '',
        p.roomNumber, `R${b.row}-C${b.column}`, p.examDate, p.examSlot
      ])))));
    rows.sort((a, b) => String(a[0]).localeCompare(String(b[0])));
    autoTable(pdf, { startY: 28, head: [['Roll', 'Name', 'Branch', 'Year', 'Room', 'Seat', 'Date', 'Slot']], body: rows, styles: { fontSize: 8 } });
    pdf.save(`Student_Seating_${activeSession?.examName || 'report'}.pdf`);
  };

  const exportInvigilator = () => {
    const pdf = new jsPDF();
    pdf.setFontSize(16); pdf.text('Invigilator Sheet', 14, 16);
    pdf.setFontSize(10); pdf.text(`Session: ${activeSession?.examName}`, 14, 22);
    const rows = filteredPlans.map(p => [
      p.examDate, p.examSlot, `Block ${p.blockNumber}`, `Floor ${p.floorNumber}`,
      p.roomNumber, p.roomType, `${p.occupiedSeats}/${p.totalSeats}`, ''
    ]);
    autoTable(pdf, { startY: 28, head: [['Date', 'Slot', 'Block', 'Floor', 'Room', 'Type', 'Occupancy', 'Invigilator Sign']], body: rows, styles: { fontSize: 9 } });
    pdf.save(`Invigilator_Sheet_${activeSession?.examName || 'report'}.pdf`);
  };

  const exportMaster = () => {
    exportStudentWise();
    setTimeout(exportInvigilator, 400);
    toast({ title: 'Master Report Generated', description: 'Student-wise + Invigilator sheets exported.' });
  };

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto space-y-6 animate-fade-in pb-12">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
              <span>Admin</span><span>/</span><span>Exams</span><span>/</span><span className="text-foreground font-medium">Seating Plans</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold mb-1">Seating Plans</h1>
            <p className="text-muted-foreground">Visualize and export generated seating arrangements.</p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button disabled={filteredPlans.length === 0}><Download className="w-4 h-4 mr-2" /> Export</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={exportStudentWise}><Users className="w-4 h-4 mr-2" /> Student-wise PDF</DropdownMenuItem>
              <DropdownMenuItem onClick={exportInvigilator}><ClipboardList className="w-4 h-4 mr-2" /> Invigilator Sheet</DropdownMenuItem>
              <DropdownMenuItem onClick={exportMaster}><FileText className="w-4 h-4 mr-2" /> Master Report</DropdownMenuItem>
              {fBlock !== 'All' && <DropdownMenuItem onClick={() => exportBlockWise(fBlock)}><Building2 className="w-4 h-4 mr-2" /> Block {fBlock} PDF</DropdownMenuItem>}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Filters */}
        <Card className="shadow-sm">
          <CardContent className="p-4 flex flex-wrap gap-3 bg-muted/20 rounded-xl">
            <Select value={fSession} onValueChange={v => { setFSession(v); setFDate('All'); setFBlock('All'); setFFloor('All'); setFRoom('All'); }}>
              <SelectTrigger className="w-[260px] bg-white"><div className="flex items-center gap-2"><Calendar className="w-4 h-4" /><SelectValue placeholder="Select exam..." /></div></SelectTrigger>
              <SelectContent>
                {sessions.length === 0 ? <SelectItem value="All" disabled>No exams</SelectItem>
                  : sessions.map(s => <SelectItem key={s.id} value={s.id}>{s.examName}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={fDate} onValueChange={setFDate}>
              <SelectTrigger className="w-[150px] bg-white"><SelectValue placeholder="Date" /></SelectTrigger>
              <SelectContent><SelectItem value="All">All Dates</SelectItem>{availableDates.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={fBlock} onValueChange={v => { setFBlock(v); setFFloor('All'); }}>
              <SelectTrigger className="w-[130px] bg-white"><SelectValue placeholder="Block" /></SelectTrigger>
              <SelectContent><SelectItem value="All">All Blocks</SelectItem>{availableBlocks.map(b => <SelectItem key={b} value={b}>Block {b}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={fFloor} onValueChange={setFFloor}>
              <SelectTrigger className="w-[130px] bg-white"><SelectValue placeholder="Floor" /></SelectTrigger>
              <SelectContent><SelectItem value="All">All Floors</SelectItem>{availableFloors.map(f => <SelectItem key={f} value={String(f)}>Floor {f}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={fRoom} onValueChange={setFRoom}>
              <SelectTrigger className="w-[140px] bg-white"><SelectValue placeholder="Room" /></SelectTrigger>
              <SelectContent><SelectItem value="All">All Rooms</SelectItem>{availableRooms.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={fBranch} onValueChange={setFBranch}>
              <SelectTrigger className="w-[140px] bg-white"><SelectValue placeholder="Branch" /></SelectTrigger>
              <SelectContent><SelectItem value="All">All Branches</SelectItem>{(activeSession?.branches || []).map((b: string) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={fYear} onValueChange={setFYear}>
              <SelectTrigger className="w-[140px] bg-white"><SelectValue placeholder="Year" /></SelectTrigger>
              <SelectContent><SelectItem value="All">All Years</SelectItem>{['1st','2nd','3rd','4th'].map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
            </Select>
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input className="pl-9 bg-white" placeholder="Search roll / name / branch / room..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        {/* KPI Summary */}
        {(() => {
          const totalConflicts = filteredPlans.reduce((a, p) => a + (p.conflictCount || 0), 0);
          const avgQuality = filteredPlans.length
            ? Math.round(filteredPlans.reduce((a, p) => a + (p.seatingQualityScore || 0), 0) / filteredPlans.length)
            : 0;
          const avgUtil = totalSeats ? Math.round((totalOccupied / totalSeats) * 100) : 0;
          return (
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
              <KpiCard label="Rooms Utilized" value={filteredPlans.length} icon={<Building2 className="w-5 h-5 text-primary" />} />
              <KpiCard label="Total Seats" value={totalSeats} icon={<LayoutGrid className="w-5 h-5 text-blue-600" />} />
              <KpiCard label="Students Allocated" value={totalOccupied} icon={<Users className="w-5 h-5 text-emerald-600" />} />
              <KpiCard label="Avg Occupancy" value={`${avgUtil}%`} icon={<Activity className="w-5 h-5 text-amber-600" />} />
              <KpiCard label="Quality Score" value={`${avgQuality}/100`} icon={<Activity className="w-5 h-5 text-emerald-600" />} />
              <KpiCard label="Conflicts" value={totalConflicts} icon={<Activity className={`w-5 h-5 ${totalConflicts > 0 ? 'text-red-600' : 'text-emerald-600'}`} />} />
            </div>
          );
        })()}

        {/* Content */}
        {loading ? (
          <div className="h-64 flex items-center justify-center"><Activity className="animate-spin text-primary w-8 h-8" /></div>
        ) : filteredPlans.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center border border-dashed rounded-xl text-muted-foreground bg-white">
            <LayoutGrid className="w-12 h-12 mb-3 opacity-40" />
            <h3 className="font-semibold">No seating plans match your filters</h3>
            <p className="text-sm mt-1">Try clearing filters, or generate seating from the previous step.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPlans.map(plan => (
              <Card key={plan.id} className="cursor-pointer hover:border-primary transition-colors group" onClick={() => setSelectedRoom(plan)}>
                <CardHeader className="pb-2 flex flex-row items-start justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      {plan.roomType === 'lab' ? <Monitor className="w-4 h-4 text-zinc-700" /> : <LayoutGrid className="w-4 h-4 text-primary" />}
                      Room {plan.roomNumber}
                    </CardTitle>
                    <CardDescription className="mt-0.5 text-xs flex items-center gap-1"><MapPin className="w-3 h-3" />Block {plan.blockNumber} • Floor {plan.floorNumber}</CardDescription>
                  </div>
                  <Badge variant="outline" className="capitalize text-[10px]">{plan.roomType}</Badge>
                </CardHeader>
                <CardContent>
                  <div className="text-xs text-muted-foreground mb-2">{plan.examDate} • {plan.examSlot}</div>
                  <div className="flex items-center justify-between border-t pt-2">
                    <div className="text-sm"><span className="font-bold tabular-nums">{plan.occupiedSeats}</span><span className="text-muted-foreground"> / {plan.totalSeats}</span></div>
                    <Badge className="text-[10px] bg-yellow-100 text-yellow-800 hover:bg-yellow-100">{Math.round((plan.occupiedSeats / plan.totalSeats) * 100)}% filled</Badge>
                  </div>
                  {(typeof plan.seatingQualityScore === 'number' || typeof plan.conflictCount === 'number') && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {typeof plan.seatingQualityScore === 'number' && (
                        <Badge variant="outline" className="text-[10px]">Quality {plan.seatingQualityScore}/100</Badge>
                      )}
                      {typeof plan.conflictCount === 'number' && (
                        <Badge className={`text-[10px] ${plan.conflictCount > 0 ? 'bg-red-100 text-red-700 hover:bg-red-100' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100'}`}>
                          {plan.conflictCount} conflict{plan.conflictCount === 1 ? '' : 's'}
                        </Badge>
                      )}
                      {plan.mode && <Badge variant="outline" className="text-[10px]">{plan.mode === 'ONE_PER_BENCH' ? '1/bench' : '2/bench'}</Badge>}
                    </div>
                  )}
                  <Button variant="ghost" size="sm" className="w-full mt-2 text-xs" onClick={(e) => { e.stopPropagation(); exportRoomWise(plan); }}>
                    <Download className="w-3 h-3 mr-1" /> Room PDF
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Room layout modal */}
      <Dialog open={!!selectedRoom} onOpenChange={(o) => { if (!o) setSelectedRoom(null); }}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="p-5 pb-3 border-b">
            <DialogTitle className="text-xl flex items-center gap-2">
              {selectedRoom?.roomType === 'lab' ? <Monitor className="w-5 h-5" /> : <LayoutGrid className="w-5 h-5" />}
              Room {selectedRoom?.roomNumber} — {selectedRoom?.roomType === 'lab' ? 'Lab Layout' : 'Classroom Layout'}
            </DialogTitle>
            <p className="text-xs text-muted-foreground">Block {selectedRoom?.blockNumber} • Floor {selectedRoom?.floorNumber} • {selectedRoom?.examDate} {selectedRoom?.examSlot}</p>
          </DialogHeader>
          <div className="overflow-auto p-6 flex-1 bg-gray-50">
            {selectedRoom?.roomType === 'lab' ? (
              <LabLayout matrix={selectedRoom ? buildMatrix(selectedRoom) : []} />
            ) : (
              <ClassroomLayout matrix={selectedRoom ? buildMatrix(selectedRoom) : []} />
            )}
            <div className="flex flex-wrap items-center justify-center gap-4 mt-6 p-3 bg-white border rounded-lg w-fit mx-auto">
              <Legend color="bg-gray-100 border-gray-300" label="Empty" />
              <Legend color="bg-yellow-100 border-yellow-300" label="Occupied (Classroom)" />
              <Legend color="bg-zinc-700 border-zinc-800 text-white" label="Workstation (Lab)" />
            </div>
          </div>
          {selectedRoom && (
            <div className="p-3 border-t bg-white flex justify-end">
              <Button onClick={() => exportRoomWise(selectedRoom)}><Download className="w-4 h-4 mr-2" /> Export Room PDF</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

const KpiCard = ({ label, value, icon }: any) => (
  <Card><CardContent className="p-4 flex items-center justify-between">
    <div><div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div><div className="text-2xl font-bold mt-1">{value}</div></div>
    <div className="p-2 bg-muted/40 rounded-lg">{icon}</div>
  </CardContent></Card>
);

const Legend = ({ color, label }: any) => (
  <div className="flex items-center gap-2 text-xs"><div className={`w-4 h-4 rounded border ${color}`} /><span>{label}</span></div>
);

const ClassroomLayout = ({ matrix }: { matrix: any[][] }) => (
  <div className="min-w-max mx-auto space-y-3">
    <div className="text-center text-xs font-semibold text-muted-foreground uppercase tracking-widest border-b-2 border-dashed pb-2 mb-4">— Board —</div>
    {matrix.map((row, ri) => (
      <div key={ri} className="flex gap-3 items-center">
        <div className="w-7 text-xs font-bold text-gray-400 text-center">R{ri + 1}</div>
        {row.map((b: any, ci: number) => (
          <div key={ci} className="flex gap-0.5 p-1.5 bg-white border-2 border-dashed border-gray-200 rounded-lg">
            <Seat s={b.seat1} />
            <Seat s={b.seat2} />
          </div>
        ))}
      </div>
    ))}
  </div>
);

const Seat = ({ s }: { s: any }) => (
  <div className={`w-24 h-14 rounded flex flex-col items-center justify-center text-[10px] font-medium border transition
    ${s?.rollNumber ? 'bg-yellow-100 border-yellow-300 text-yellow-900' : 'bg-gray-100 border-gray-200 text-gray-400'}`}>
    {s?.rollNumber ? (<><span className="font-bold">{s.rollNumber}</span><span className="text-[9px] opacity-70">{s.branch}</span></>) : 'Empty'}
  </div>
);

const LabLayout = ({ matrix }: { matrix: any[][] }) => (
  <div className="min-w-max mx-auto space-y-3">
    <div className="text-center text-xs font-semibold text-muted-foreground uppercase tracking-widest border-b-2 border-dashed pb-2 mb-4">— Instructor Console —</div>
    {matrix.map((row, ri) => (
      <div key={ri} className="flex gap-2 items-center">
        <div className="w-7 text-xs font-bold text-gray-400 text-center">R{ri + 1}</div>
        {row.map((b: any, ci: number) => (
          <Workstation key={ci} s={b.seat1} index={ci + 1} />
        ))}
      </div>
    ))}
  </div>
);

const Workstation = ({ s, index }: any) => (
  <div className="flex flex-col items-center gap-0.5">
    <div className={`w-24 h-16 rounded-md flex flex-col items-center justify-center text-[10px] font-medium border-2 shadow-sm transition
      ${s?.rollNumber ? 'bg-zinc-700 border-zinc-800 text-white' : 'bg-zinc-200 border-zinc-300 text-zinc-500'}`}>
      <Monitor className={`w-3 h-3 mb-0.5 ${s?.rollNumber ? 'opacity-90' : 'opacity-40'}`} />
      {s?.rollNumber ? (<><span className="font-bold">{s.rollNumber}</span><span className="text-[9px] opacity-80">{s.branch}</span></>) : <span>PC-{index}</span>}
    </div>
  </div>
);
