import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Sparkles, Activity, AlertCircle, Settings2, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { db } from '@/lib/firebase';
import {
  collection, query, where, getDocs, addDoc, doc, updateDoc, writeBatch,
  serverTimestamp, onSnapshot
} from 'firebase/firestore';
import { toast } from '@/hooks/use-toast';
import { isUsableExamRoom, isLabRoom, roomCapacity, normYear } from '@/lib/examUtils';

export default function AdminGenerateSeating() {
  const { user, college } = useAuth();
  const navigate = useNavigate();
  const institutionId = college?.id || (user as any)?.institutionId;

  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMsg, setStatusMsg] = useState('');
  const [constraints, setConstraints] = useState({
    seatsPerBench: 'two', // 'one' or 'two'
    branchSeparation: true,
    yearSeparation: true,
    suppSeparation: true,
  });

  useEffect(() => {
    if (!institutionId) return;
    const unsub = onSnapshot(
      query(collection(db, 'examSessions'),
        where('institutionId', '==', institutionId),
        where('status', 'in', ['SCHEDULED', 'SEATED'])),
      snap => {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
        setSessions(data);
        if (!selectedId && data.length > 0) setSelectedId(data[0].id);
      }
    );
    return () => unsub();
  }, [institutionId]);

  const active = useMemo(() => sessions.find(s => s.id === selectedId), [sessions, selectedId]);

  /** Interleave students to avoid same-branch / same-year neighbours. */
  const interleaveStudents = (students: any[]): any[] => {
    const buckets: Record<string, any[]> = {};
    students.forEach(s => {
      const k = `${s.branch || 'UNK'}|${normYear(s.year)}`;
      (buckets[k] = buckets[k] || []).push(s);
    });
    Object.values(buckets).forEach(arr => arr.sort((a, b) => String(a.rollNumber).localeCompare(String(b.rollNumber))));
    const keys = Object.keys(buckets).sort((a, b) => buckets[b].length - buckets[a].length);
    const out: any[] = [];
    let safety = students.length + 50;
    while (out.length < students.length && safety-- > 0) {
      for (const k of keys) {
        const arr = buckets[k];
        if (arr.length === 0) continue;
        out.push(arr.shift());
        if (out.length >= students.length) break;
      }
    }
    return out;
  };

  const handleGenerate = async () => {
    if (!active) return;
    setGenerating(true);
    setProgress(0);
    setStatusMsg('Loading rooms and students...');

    try {
      // Fetch rooms
      const roomsSnap = await getDocs(query(collection(db, 'classrooms'), where('institutionId', '==', institutionId)));
      const rooms = roomsSnap.docs
        .map(d => ({ id: d.id, ...d.data() } as any))
        .filter(r => isUsableExamRoom(r.roomType))
        .sort((a, b) => {
          // classrooms first, then labs
          const aLab = isLabRoom(a.roomType) ? 1 : 0;
          const bLab = isLabRoom(b.roomType) ? 1 : 0;
          if (aLab !== bLab) return aLab - bLab;
          return String(a.blockNumber || '').localeCompare(String(b.blockNumber || ''))
            || String(a.roomNumber || '').localeCompare(String(b.roomNumber || ''));
        });

      if (rooms.length === 0) throw new Error('No usable classrooms or labs available.');

      // Fetch students
      const stSnap = await getDocs(query(collection(db, 'students'), where('institutionId', '==', institutionId)));
      const allStudents = stSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));

      // Fetch schedule rows for this session
      const schSnap = await getDocs(query(collection(db, 'examSchedule'),
        where('institutionId', '==', institutionId),
        where('sessionId', '==', selectedId)));
      const scheduleRows = schSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));

      // Clear previous seating plans for this session
      const prev = await getDocs(query(collection(db, 'seatingPlans'),
        where('institutionId', '==', institutionId),
        where('sessionId', '==', selectedId)));
      const clearBatch = writeBatch(db);
      prev.docs.forEach(d => clearBatch.delete(d.ref));
      await clearBatch.commit();

      // Group schedule rows by (date, slot) — same-slot rows share room pool
      const slotGroups: Record<string, any[]> = {};
      scheduleRows.forEach(r => {
        const k = `${r.date}|${r.slot}`;
        (slotGroups[k] = slotGroups[k] || []).push(r);
      });

      const slotKeys = Object.keys(slotGroups).sort();
      let processed = 0;
      let totalAllocations = 0;

      for (const sk of slotKeys) {
        const rowsInSlot = slotGroups[sk];
        setStatusMsg(`Allocating ${sk}...`);

        // Gather all students for this slot
        const allSlotStudents: any[] = [];
        for (const row of rowsInSlot) {
          const matches = allStudents.filter(st =>
            row.branches.includes(st.branch)
            && normYear(st.year) === normYear(row.year)
            && (active.examCategory === 'Regular + Supplementary'
              || active.examCategory === (st.examType || 'Regular'))
          );
          matches.forEach(m => allSlotStudents.push({ ...m, _subject: row }));
        }

        const interleaved = constraints.branchSeparation ? interleaveStudents(allSlotStudents) : allSlotStudents;

        let idx = 0;
        const batch = writeBatch(db);
        for (const room of rooms) {
          if (idx >= interleaved.length) break;
          const lab = isLabRoom(room.roomType);
          const rows = parseInt(room.rowsOfBenches ?? room.rows, 10) || 5;
          const cols = parseInt(room.columnsOfBenches ?? room.columns, 10) || 5;
          const matrix: any[] = [];

          for (let r = 0; r < rows; r++) {
            const rowArr: any[] = [];
            for (let c = 0; c < cols; c++) {
              const s1 = idx < interleaved.length ? interleaved[idx++] : null;
              let s2: any = null;
              if (!lab && constraints.seatsPerBench === 'two') {
                // Pick next non-conflicting student
                let pick = idx;
                while (pick < interleaved.length) {
                  const cand = interleaved[pick];
                  const sameBranch = constraints.branchSeparation && cand.branch === s1?.branch;
                  const consecRoll = Math.abs(parseInt(cand.rollNumber) - parseInt(s1?.rollNumber || '0')) === 1;
                  if (!sameBranch && !consecRoll) { s2 = cand; interleaved.splice(pick, 1); break; }
                  pick++;
                }
                if (!s2 && idx < interleaved.length) { s2 = interleaved[idx++]; }
              }
              const toSeat = (s: any) => s ? {
                studentId: s.id, rollNumber: String(s.rollNumber || ''), name: s.name,
                branch: s.branch, year: normYear(s.year),
                subjectCode: s._subject?.subjectCode, subjectName: s._subject?.subjectName,
                scheduleId: s._subject?.id,
              } : null;
              rowArr.push({ row: r + 1, column: c + 1, seat1: toSeat(s1), seat2: toSeat(s2) });
            }
            matrix.push(rowArr);
          }

          const occupied = matrix.flat().reduce((acc, b) => acc + (b.seat1 ? 1 : 0) + (b.seat2 ? 1 : 0), 0);
          if (occupied === 0) continue;
          totalAllocations += occupied;

          const planRef = doc(collection(db, 'seatingPlans'));
          batch.set(planRef, {
            institutionId,
            sessionId: selectedId,
            sessionName: active.examName,
            examDate: rowsInSlot[0].date,
            examSlot: rowsInSlot[0].slot,
            startTime: rowsInSlot[0].startTime,
            endTime: rowsInSlot[0].endTime,
            scheduleIds: rowsInSlot.map(r => r.id),
            roomId: room.roomNumber || room.id,
            roomNumber: room.roomNumber,
            blockNumber: room.blockNumber,
            floorNumber: room.floorNumber,
            roomType: lab ? 'lab' : 'classroom',
            rows, cols,
            seatingMatrix: matrix,
            occupiedSeats: occupied,
            totalSeats: lab ? rows * cols : rows * cols * 2,
            createdAt: serverTimestamp(),
            createdBy: (user as any)?.uid || (user as any)?.id || 'admin',
          });
        }
        await batch.commit();
        processed++;
        setProgress(Math.round((processed / slotKeys.length) * 100));
      }

      await updateDoc(doc(db, 'examSessions', selectedId), { status: 'SEATED' });

      setStatusMsg(`Allocated ${totalAllocations} seats across ${slotKeys.length} session(s).`);
      toast({ title: 'Seating generated', description: `${totalAllocations} seats allocated.` });
      setTimeout(() => navigate('/admin/exams/seating-plans'), 1200);
    } catch (err: any) {
      console.error(err);
      setStatusMsg(`Error: ${err.message}`);
      toast({ title: 'Generation failed', description: err.message, variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto space-y-6 animate-fade-in pb-12">
        <div>
          <div className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
            <span>Admin</span><span>/</span><span>Exams</span><span>/</span><span className="text-foreground font-medium">Generate Seating</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold mb-1 flex items-center gap-3">
            <Sparkles className="w-7 h-7 text-primary" /> AI Seating Generator
          </h1>
          <p className="text-muted-foreground">Allocate students to rooms across every scheduled subject in one click.</p>
        </div>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>1. Select Scheduled Exam</CardTitle>
            <CardDescription>Only exams that have a generated schedule appear here.</CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={selectedId} onValueChange={setSelectedId} disabled={generating}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Select exam session..." /></SelectTrigger>
              <SelectContent>
                {sessions.length === 0 ? (
                  <div className="p-3 text-sm text-muted-foreground">No scheduled exams. Create and schedule one first.</div>
                ) : sessions.map(s => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.examName} — {s.subjects?.length || 0} subjects
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {active && (
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge variant="secondary">{active.totalStudents || 0} students</Badge>
                <Badge variant="outline">{active.subjects?.length || 0} subjects</Badge>
                <Badge variant="outline">{active.branches?.length || 0} branches</Badge>
                <Badge className={active.status === 'SEATED' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}>{active.status}</Badge>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Settings2 className="w-5 h-5 text-primary" />2. Seating Constraints</CardTitle>
            <CardDescription>Rules applied by the allocation engine.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Seats per Bench (classrooms)</Label>
              <Select value={constraints.seatsPerBench} onValueChange={v => setConstraints({ ...constraints, seatsPerBench: v })}>
                <SelectTrigger className="w-full sm:w-72"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="one">One Student per Bench</SelectItem>
                  <SelectItem value="two">Two Students per Bench</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <ToggleRow label="Branch Separation" value={constraints.branchSeparation} onChange={v => setConstraints({ ...constraints, branchSeparation: v })} />
              <ToggleRow label="Year Separation" value={constraints.yearSeparation} onChange={v => setConstraints({ ...constraints, yearSeparation: v })} />
              <ToggleRow label="Supplementary Separation" value={constraints.suppSeparation} onChange={v => setConstraints({ ...constraints, suppSeparation: v })} />
            </div>
            <div className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
              Engine auto-uses Classrooms + Labs. HOD rooms, faculty rooms, washrooms and stores are ignored.
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-6 space-y-4">
            <Button onClick={handleGenerate} disabled={!active || generating} className="w-full py-6 text-base">
              {generating ? <><Activity className="w-5 h-5 mr-2 animate-spin" /> Allocating...</> : <><Sparkles className="w-5 h-5 mr-2" /> Generate Seating Plan</>}
            </Button>
            {generating && <Progress value={progress} className="h-2" />}
            {statusMsg && (
              <div className={`p-3 rounded-lg text-sm flex items-center gap-2 ${statusMsg.startsWith('Error') ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-blue-50 text-blue-700 border border-blue-200'}`}>
                {statusMsg.startsWith('Error') ? <AlertCircle className="w-4 h-4" /> : statusMsg.startsWith('Allocated') ? <CheckCircle2 className="w-4 h-4" /> : <Activity className="w-4 h-4 animate-spin" />}
                {statusMsg}
              </div>
            )}
            {active?.status === 'SEATED' && !generating && (
              <Button variant="outline" className="w-full" onClick={() => navigate('/admin/exams/seating-plans')}>
                View Seating Plans <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}

const ToggleRow = ({ label, value, onChange }: any) => (
  <div className="flex items-center justify-between border rounded-lg px-3 py-2">
    <Label className="text-sm">{label}</Label>
    <Switch checked={value} onCheckedChange={onChange} />
  </div>
);
