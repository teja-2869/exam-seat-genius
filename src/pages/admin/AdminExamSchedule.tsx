import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { db } from '@/lib/firebase';
import {
  collection, query, where, onSnapshot, getDocs, addDoc, writeBatch, doc,
  deleteDoc, serverTimestamp, updateDoc
} from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { Calendar, Sparkles, Activity, Trash2, ArrowRight, BookOpen, CheckCircle2, Clock, Layers } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { SLOT_TIMES, normYear, addDays, todayPlus, isSunday, isUsableExamRoom } from '@/lib/examUtils';
import { computeSeatingRisk, pickBenchMode, scoreSchedule, totalRoomCapacity } from '@/lib/examOptimizer';

export default function AdminExamSchedule() {
  const { user, college } = useAuth();
  const navigate = useNavigate();
  const institutionId = college?.id || (user as any)?.institutionId;

  const [sessions, setSessions] = useState<any[]>([]);
  const [scheduleRows, setScheduleRows] = useState<any[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!institutionId) return;
    const unsub = onSnapshot(
      query(collection(db, 'examSessions'), where('institutionId', '==', institutionId)),
      snap => {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as any))
          .sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
        setSessions(data);
        if (!selectedSessionId && data.length > 0) setSelectedSessionId(data[0].id);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [institutionId]);

  useEffect(() => {
    if (!institutionId || !selectedSessionId) { setScheduleRows([]); return; }
    const unsub = onSnapshot(
      query(collection(db, 'examSchedule'),
        where('institutionId', '==', institutionId),
        where('sessionId', '==', selectedSessionId)),
      snap => {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as any))
          .sort((a, b) => (a.date + a.slot).localeCompare(b.date + b.slot));
        setScheduleRows(data);
      }
    );
    return () => unsub();
  }, [institutionId, selectedSessionId]);

  const activeSession = useMemo(() => sessions.find(s => s.id === selectedSessionId), [sessions, selectedSessionId]);

  // KPI metrics
  const metrics = useMemo(() => {
    const totalExams = sessions.length;
    const scheduledSubjects = scheduleRows.length;
    const pendingSubjects = (activeSession?.subjects?.length || 0) - scheduledSubjects;
    const examDays = new Set(scheduleRows.map(r => r.date)).size;
    return { totalExams, scheduledSubjects, pendingSubjects: Math.max(0, pendingSubjects), examDays };
  }, [sessions, scheduleRows, activeSession]);

  const handleGenerate = async () => {
    if (!activeSession) return;
    setGenerating(true);
    try {
      // Clear any prior schedule rows for this session
      const existing = await getDocs(query(
        collection(db, 'examSchedule'),
        where('institutionId', '==', institutionId),
        where('sessionId', '==', selectedSessionId)
      ));
      const clearBatch = writeBatch(db);
      existing.docs.forEach(d => clearBatch.delete(d.ref));
      await clearBatch.commit();

      // Fetch students for counts
      const stSnap = await getDocs(query(collection(db, 'students'), where('institutionId', '==', institutionId)));
      const allStudents = stSnap.docs.map(d => d.data() as any);

      const rules = activeSession.rules || {};
      const subjects: any[] = activeSession.subjects || [];

      // Group by (year). We try to interleave so same cohort isn't on same day.
      // Sort: by year then code for determinism
      subjects.sort((a, b) => (a.year + a.subjectCode).localeCompare(b.year + b.subjectCode));

      // cohort = `${branch}|${year}` — same student set
      // Track per-cohort: lastDate + count per date
      const cohortLast: Record<string, string> = {};
      const dateCohortCount: Record<string, Record<string, number>> = {};
      const dateSlotUsed: Record<string, Set<string>> = {};
      const minGap = Math.max(0, parseInt(rules.minGapDays) || 0);
      const maxPerDay = Math.max(1, parseInt(rules.maxPerDay) || 1);

      const slots = ['Morning', 'Afternoon'];
      const startBase = todayPlus(3);

      const findSlot = (cohorts: string[]): { date: string; slot: string } => {
        let cursor = startBase;
        for (let safety = 0; safety < 365; safety++) {
          if (!rules.includeSunday && isSunday(cursor)) { cursor = addDays(cursor, 1); continue; }
          // check gap rule for every cohort
          const gapOk = cohorts.every(c => {
            const last = cohortLast[c];
            if (!last) return true;
            const diff = Math.round((new Date(cursor).getTime() - new Date(last).getTime()) / 86400000);
            return diff > minGap;
          });
          const countOk = cohorts.every(c => (dateCohortCount[cursor]?.[c] || 0) < maxPerDay);
          if (gapOk && countOk) {
            for (const slot of slots) {
              const used = dateSlotUsed[cursor] || new Set();
              const slotKey = (sl: string) => cohorts.map(c => `${sl}|${c}`);
              const conflict = !rules.allowParallel && slotKey(slot).some(k => used.has(k));
              if (!conflict) return { date: cursor, slot };
            }
          }
          cursor = addDays(cursor, 1);
        }
        return { date: cursor, slot: 'Morning' };
      };

      const batch = writeBatch(db);
      const rowsToAdd: any[] = [];

      for (const sub of subjects) {
        const subYear = normYear(sub.year);
        // For each branch in session.branches, this subject applies if its branch matches OR if subject.branch is the actual branch
        const branches = activeSession.branches?.includes(sub.branch) ? [sub.branch] : [sub.branch];
        const cohorts = branches.map((b: string) => `${b}|${subYear}`);

        const { date, slot } = findSlot(cohorts);
        cohorts.forEach((c: string) => {
          cohortLast[c] = date;
          dateCohortCount[date] = dateCohortCount[date] || {};
          dateCohortCount[date][c] = (dateCohortCount[date][c] || 0) + 1;
          dateSlotUsed[date] = dateSlotUsed[date] || new Set();
          dateSlotUsed[date].add(`${slot}|${c}`);
        });

        const studentCount = allStudents.filter(st =>
          branches.includes(st.branch) &&
          normYear(st.year) === subYear &&
          (activeSession.examCategory === 'Regular + Supplementary'
            || activeSession.examCategory === (st.examType || 'Regular'))
        ).length;

        const ref = doc(collection(db, 'examSchedule'));
        batch.set(ref, {
          institutionId,
          sessionId: selectedSessionId,
          sessionName: activeSession.examName,
          subjectId: sub.id,
          subjectCode: sub.subjectCode,
          subjectName: sub.subjectName,
          branches,
          year: subYear,
          semester: sub.semester,
          date,
          slot,
          startTime: SLOT_TIMES[slot].start,
          endTime: SLOT_TIMES[slot].end,
          studentCount,
          status: 'SCHEDULED',
          createdAt: serverTimestamp(),
        });
        rowsToAdd.push({ subject: sub.subjectCode, date, slot });
      }

      await batch.commit();
      await updateDoc(doc(db, 'examSessions', selectedSessionId), { status: 'SCHEDULED' });

      toast({ title: 'Schedule generated', description: `${rowsToAdd.length} subjects scheduled across ${new Set(rowsToAdd.map(r => r.date)).size} days.` });
    } catch (err: any) {
      console.error(err);
      toast({ title: 'Schedule generation failed', description: err.message, variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  const handleDeleteSession = async (id: string) => {
    if (!confirm('Delete this exam session and its schedule?')) return;
    try {
      // delete schedule rows
      const sch = await getDocs(query(collection(db, 'examSchedule'),
        where('institutionId', '==', institutionId),
        where('sessionId', '==', id)));
      const b = writeBatch(db);
      sch.docs.forEach(d => b.delete(d.ref));
      await b.commit();
      await deleteDoc(doc(db, 'examSessions', id));
      if (selectedSessionId === id) setSelectedSessionId('');
      toast({ title: 'Session deleted' });
    } catch (err: any) {
      toast({ title: 'Delete failed', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto space-y-6 animate-fade-in pb-12">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
              <span>Admin</span><span>/</span><span>Exams</span><span>/</span><span className="text-foreground font-medium">Exam Schedule</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold mb-1">Exam Schedule</h1>
            <p className="text-muted-foreground">Generate and review AI-built timetables for created exams.</p>
          </div>
          <Button onClick={() => navigate('/admin/exams/create')}>+ Create Exam</Button>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard label="Total Exams" value={metrics.totalExams} icon={<BookOpen className="w-5 h-5 text-primary" />} />
          <KpiCard label="Scheduled Subjects" value={metrics.scheduledSubjects} icon={<CheckCircle2 className="w-5 h-5 text-emerald-600" />} />
          <KpiCard label="Pending Subjects" value={metrics.pendingSubjects} icon={<Clock className="w-5 h-5 text-amber-600" />} />
          <KpiCard label="Exam Days" value={metrics.examDays} icon={<Calendar className="w-5 h-5 text-blue-600" />} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sessions list */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Exam Sessions</CardTitle>
              <CardDescription>Pick a session to view or generate its schedule.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 max-h-[600px] overflow-y-auto">
              {loading && <div className="flex justify-center py-8"><Activity className="animate-spin text-muted-foreground" /></div>}
              {!loading && sessions.length === 0 && (
                <div className="text-center text-sm text-muted-foreground py-8">
                  No exam sessions yet.
                  <Button variant="link" onClick={() => navigate('/admin/exams/create')}>Create one</Button>
                </div>
              )}
              {sessions.map(s => (
                <button
                  key={s.id}
                  onClick={() => setSelectedSessionId(s.id)}
                  className={`w-full text-left p-3 rounded-lg border transition-all ${selectedSessionId === s.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/30'}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate">{s.examName}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{s.examType} • {s.academicYear}</div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        <Badge variant="secondary" className="text-[10px]">{s.subjects?.length || 0} subjects</Badge>
                        <Badge variant="outline" className="text-[10px]">{s.totalStudents || 0} students</Badge>
                        <Badge className={`text-[10px] ${s.status === 'SCHEDULED' ? 'bg-emerald-100 text-emerald-700' : s.status === 'SEATED' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>{s.status}</Badge>
                      </div>
                    </div>
                    <Trash2 className="w-4 h-4 text-muted-foreground hover:text-red-500 cursor-pointer flex-shrink-0" onClick={(e) => { e.stopPropagation(); handleDeleteSession(s.id); }} />
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>

          {/* Schedule detail */}
          <Card className="shadow-sm lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-3">
              <div>
                <CardTitle className="text-base">{activeSession ? activeSession.examName : 'Select a session'}</CardTitle>
                <CardDescription>{activeSession ? `${activeSession.subjects?.length || 0} subjects • ${activeSession.branches?.join(', ')}` : '—'}</CardDescription>
              </div>
              {activeSession && (
                <div className="flex gap-2">
                  <Button onClick={handleGenerate} disabled={generating}>
                    {generating ? <><Activity className="w-4 h-4 mr-2 animate-spin" />Generating</> : <><Sparkles className="w-4 h-4 mr-2" />Generate Schedule</>}
                  </Button>
                  {scheduleRows.length > 0 && (
                    <Button variant="outline" onClick={() => navigate('/admin-generate-seating')}>
                      Next: Seating <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  )}
                </div>
              )}
            </CardHeader>
            <CardContent>
              {!activeSession ? (
                <div className="text-center py-12 text-muted-foreground">Select a session to view its schedule.</div>
              ) : scheduleRows.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground border border-dashed rounded-lg">
                  <Layers className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  <p>No schedule generated yet.</p>
                  <p className="text-xs mt-1">Click <strong>Generate Schedule</strong> to let AI build the timetable.</p>
                </div>
              ) : (
                <div className="overflow-x-auto border rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2 text-left">Date</th>
                        <th className="px-3 py-2 text-left">Session</th>
                        <th className="px-3 py-2 text-left">Code</th>
                        <th className="px-3 py-2 text-left">Subject</th>
                        <th className="px-3 py-2 text-left">Year</th>
                        <th className="px-3 py-2 text-left">Branch</th>
                        <th className="px-3 py-2 text-left">Students</th>
                        <th className="px-3 py-2 text-left">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {scheduleRows.map(r => (
                        <tr key={r.id} className="hover:bg-muted/20">
                          <td className="px-3 py-2 font-medium">{r.date}</td>
                          <td className="px-3 py-2">
                            <Badge variant="outline" className="text-[10px]">{r.slot}</Badge>
                            <div className="text-[10px] text-muted-foreground mt-0.5">{r.startTime}-{r.endTime}</div>
                          </td>
                          <td className="px-3 py-2 font-mono text-xs">{r.subjectCode}</td>
                          <td className="px-3 py-2">{r.subjectName}</td>
                          <td className="px-3 py-2">{r.year}</td>
                          <td className="px-3 py-2">{(r.branches || []).join(', ')}</td>
                          <td className="px-3 py-2 tabular-nums">{r.studentCount}</td>
                          <td className="px-3 py-2"><Badge className="text-[10px] bg-emerald-100 text-emerald-700">{r.status}</Badge></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}

const KpiCard = ({ label, value, icon }: any) => (
  <Card className="shadow-sm">
    <CardContent className="p-4 flex items-center justify-between">
      <div>
        <div className="text-xs text-muted-foreground uppercase tracking-wider">{label}</div>
        <div className="text-2xl font-bold mt-1 tabular-nums">{value}</div>
      </div>
      <div className="p-2 bg-muted/40 rounded-lg">{icon}</div>
    </CardContent>
  </Card>
);
