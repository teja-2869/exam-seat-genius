import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import { Sparkles, Activity, BookOpen, Users, Layers, Calendar, Gauge, ShieldCheck, AlertTriangle } from 'lucide-react';
import { YEAR_LABELS, normYear, SLOT_TIMES, isUsableExamRoom } from '@/lib/examUtils';
import { classifySubjects, buildBranchSimilarityMatrix, detectSubjectFamilies, durationBandForExamType, analyzeFeasibility, schedulingStrategyConfig, type SchedulingStrategy, type SeatingStrategy, type BranchSeparation } from '@/lib/examOptimizer';
import { subjectOffers, getOfferings } from '@/lib/subjectUtils';

const EXAM_TYPES = [
  'Internal Assessment', 'Mid Examination', 'Semester Examination',
  'Supplementary Examination', 'Practical Examination', 'Lab Examination',
];
const EXAM_CATEGORIES = ['Regular', 'Supplementary', 'Regular + Supplementary'];

export default function AdminCreateExam() {
  const { college, user } = useAuth();
  const navigate = useNavigate();
  const institutionId = college?.id || (user as any)?.institutionId;

  const [saving, setSaving] = useState(false);
  const [branches, setBranches] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);

  const [form, setForm] = useState({
    examName: '',
    examType: 'Semester Examination',
    academicYear: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
    semester: '1',
    regulation: 'R23',
    years: [] as string[],
    branches: [] as string[],
    examCategory: 'Regular',
    selectedSubjectIds: [] as string[],
    maxDurationDays: 7,
    customDuration: false,
    schedulingStrategy: 'AI_OPTIMIZED' as SchedulingStrategy,
    seatingStrategy: 'BALANCED' as SeatingStrategy,
    branchSeparation: 'BALANCED' as BranchSeparation,
    rules: {
      minGapDays: 1,
      maxPerDay: 2,
      includeSunday: false,
      includeHolidays: false,
      allowParallel: false,
    },
  });

  useEffect(() => {
    if (!institutionId) return;
    (async () => {
      const [brSnap, subSnap, stSnap] = await Promise.all([
        getDocs(query(collection(db, 'branches'), where('institutionId', '==', institutionId))),
        getDocs(query(collection(db, 'subjects'), where('institutionId', '==', institutionId))),
        getDocs(query(collection(db, 'students'), where('institutionId', '==', institutionId))),
      ]);
      setBranches(brSnap.docs.map(d => ({ id: d.id, ...d.data() } as any)));
      setSubjects(subSnap.docs.map(d => ({ id: d.id, ...d.data() } as any)).filter(s => !s.deleted && s.status !== 'Inactive'));
      setStudents(stSnap.docs.map(d => ({ id: d.id, ...d.data() } as any)));
    })();
  }, [institutionId]);

  // Filter subjects matching current selection (uses master catalog offeredTo[]).
  const matchingSubjects = useMemo(() => {
    return subjects.filter(s => {
      if (form.regulation && s.regulation && s.regulation !== form.regulation) return false;
      const offs = getOfferings(s);
      if (offs.length === 0) return false;
      // Subject must offer at least one (branch, semester) the user picked.
      const branchSel = form.branches.length ? form.branches : null;
      const yearSel = form.years.length ? form.years.map(normYear) : null;
      return offs.some(o => {
        if (branchSel && !branchSel.includes(o.branch)) return false;
        if (form.semester && String(o.semester) !== String(form.semester)) return false;
        if (yearSel && !yearSel.includes(normYear(o.year))) return false;
        return true;
      });
    });
  }, [subjects, form.branches, form.years, form.semester, form.regulation]);

  // Computed metrics
  const metrics = useMemo(() => {
    const matchingStudents = students.filter(st => {
      if (form.branches.length && !form.branches.includes(st.branch)) return false;
      if (form.years.length && !form.years.map(normYear).includes(normYear(st.year))) return false;
      if (form.examCategory === 'Regular' && (st.examType || 'Regular') !== 'Regular') return false;
      if (form.examCategory === 'Supplementary' && st.examType !== 'Supplementary') return false;
      return true;
    });
    const subs = form.selectedSubjectIds.length;
    const perDay = Math.max(1, form.rules.maxPerDay);
    return {
      totalStudents: matchingStudents.length,
      totalSubjects: subs,
      totalBranches: form.branches.length,
      estimatedDays: Math.ceil(subs / perDay),
    };
  }, [students, form]);

  // AI classification preview
  const aiPreview = useMemo(() => {
    const selected = subjects.filter(s => form.selectedSubjectIds.includes(s.id));
    if (selected.length === 0) return { common: 0, core: 0, branchSpec: 0, lab: 0 };
    const c = classifySubjects(selected, subjects);
    return {
      common: c.filter(x => x.classification === 'COMMON').length,
      core: c.filter(x => x.classification === 'CORE').length,
      branchSpec: c.filter(x => x.classification === 'BRANCH').length,
      lab: c.filter(x => x.classification === 'LAB').length,
    };
  }, [subjects, form.selectedSubjectIds]);

  const toggleArr = (key: 'years' | 'branches' | 'selectedSubjectIds', v: string) => {
    const arr = form[key] as string[];
    setForm({ ...form, [key]: arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v] });
  };

  const toggleAllSubjects = () => {
    const allIds = matchingSubjects.map(s => s.id);
    const allSelected = allIds.every(id => form.selectedSubjectIds.includes(id));
    setForm({ ...form, selectedSubjectIds: allSelected ? form.selectedSubjectIds.filter(id => !allIds.includes(id)) : Array.from(new Set([...form.selectedSubjectIds, ...allIds])) });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!institutionId) return;
    if (!form.examName.trim()) return toast({ title: 'Exam name required', variant: 'destructive' });
    if (form.years.length === 0) return toast({ title: 'Select at least one year', variant: 'destructive' });
    if (form.branches.length === 0) return toast({ title: 'Select at least one branch', variant: 'destructive' });
    if (form.selectedSubjectIds.length === 0) return toast({ title: 'Select at least one subject', variant: 'destructive' });

    setSaving(true);
    try {
      // Expand each selected master subject into one entry per (branch, semester)
      // offering that matches the form's branch/year/semester selections.
      const selectedSubjectsData: any[] = [];
      subjects
        .filter(s => form.selectedSubjectIds.includes(s.id))
        .forEach(s => {
          const offs = getOfferings(s);
          const yearSel = form.years.map(normYear);
          const matched = offs.filter(o =>
            form.branches.includes(o.branch) &&
            (!form.semester || String(o.semester) === String(form.semester)) &&
            (yearSel.length === 0 || yearSel.includes(normYear(o.year)))
          );
          (matched.length ? matched : offs).forEach(o => {
            selectedSubjectsData.push({
              id: s.id,
              subjectCode: s.subjectCode,
              subjectName: s.subjectName,
              branch: o.branch,
              year: normYear(o.year),
              semester: String(o.semester),
              credits: s.credits || 0,
            });
          });
        });

      // AI: classify subjects and build branch similarity from full institution subject pool
      const classifications = classifySubjects(selectedSubjectsData, subjects);
      const branchSimilarity = buildBranchSimilarityMatrix(subjects.filter(s =>
        getOfferings(s).some(o => form.branches.includes(o.branch))
      ));
      const commonSubjectCodes = Array.from(new Set(classifications.filter(c => c.classification === 'COMMON').map(c => c.subjectCode)));
      const subjectFamilies = detectSubjectFamilies(selectedSubjectsData);

      await addDoc(collection(db, 'examSessions'), {
        institutionId,
        examName: form.examName.trim(),
        examType: form.examType,
        academicYear: form.academicYear,
        semester: form.semester,
        regulation: form.regulation,
        years: form.years.map(normYear),
        branches: form.branches,
        examCategory: form.examCategory,
        subjectIds: form.selectedSubjectIds,
        subjects: selectedSubjectsData,
        subjectClassifications: classifications,
        branchSimilarity,
        commonSubjectCodes,
        subjectFamilies,
        rules: form.rules,
        totalStudents: metrics.totalStudents,
        totalSubjects: metrics.totalSubjects,
        totalDaysEstimated: metrics.estimatedDays,
        status: 'DRAFT',
        createdBy: (user as any)?.uid || (user as any)?.id || 'admin',
        createdAt: serverTimestamp(),
      });

      toast({ title: 'Exam created', description: `${form.examName} is ready to be scheduled.` });
      navigate('/admin/exams/schedule');
    } catch (err: any) {
      console.error(err);
      toast({ title: 'Failed to create exam', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto space-y-6 animate-fade-in pb-12">
        <div>
          <div className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
            <span>Admin</span><span>/</span><span>Exams</span><span>/</span><span className="text-foreground font-medium">Create Exam</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold mb-2">New Examination</h1>
          <p className="text-muted-foreground">Define a multi-subject examination session for your institution.</p>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Section 1: Exam Information */}
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><BookOpen className="w-5 h-5 text-primary" /> 1. Exam Information</CardTitle>
                <CardDescription>Core metadata about this examination.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Exam Name *</Label>
                    <Input required placeholder="e.g., Sem-1 Regular Dec 2026" value={form.examName} onChange={e => setForm({ ...form, examName: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Exam Type</Label>
                    <Select value={form.examType} onValueChange={v => setForm({ ...form, examType: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{EXAM_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Academic Year</Label>
                    <Input value={form.academicYear} onChange={e => setForm({ ...form, academicYear: e.target.value })} placeholder="2026-2027" />
                  </div>
                  <div className="space-y-2">
                    <Label>Semester</Label>
                    <Select value={form.semester} onValueChange={v => setForm({ ...form, semester: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{['1','2','3','4','5','6','7','8'].map(s => <SelectItem key={s} value={s}>Semester {s}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Regulation</Label>
                    <Input value={form.regulation} onChange={e => setForm({ ...form, regulation: e.target.value })} placeholder="R23" />
                  </div>
                  <div className="space-y-2">
                    <Label>Exam Category</Label>
                    <Select value={form.examCategory} onValueChange={v => setForm({ ...form, examCategory: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{EXAM_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <Label>Years Included *</Label>
                  <div className="flex flex-wrap gap-2">
                    {YEAR_LABELS.map(y => (
                      <label key={y} className="flex items-center gap-2 border px-3 py-1.5 rounded-md text-sm cursor-pointer hover:bg-muted/50">
                        <Checkbox checked={form.years.includes(y)} onCheckedChange={() => toggleArr('years', y)} />
                        <span>{y}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Branches Included *</Label>
                  <div className="flex flex-wrap gap-2">
                    {branches.length === 0 && <span className="text-xs text-muted-foreground">No branches found. Create branches first.</span>}
                    {branches.map((b: any) => {
                      const name = b.branchName || b.name || b.branchCode;
                      return (
                        <label key={b.id} className="flex items-center gap-2 border px-3 py-1.5 rounded-md text-sm cursor-pointer hover:bg-muted/50">
                          <Checkbox checked={form.branches.includes(name)} onCheckedChange={() => toggleArr('branches', name)} />
                          <span>{name}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Section 2: Subjects */}
            <Card className="shadow-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2"><Layers className="w-5 h-5 text-primary" /> 2. Subject Selection</CardTitle>
                    <CardDescription>Auto-loaded from Subject Management. Filtered by branch / year / semester.</CardDescription>
                  </div>
                  {matchingSubjects.length > 0 && (
                    <Button type="button" variant="outline" size="sm" onClick={toggleAllSubjects}>
                      {matchingSubjects.every(s => form.selectedSubjectIds.includes(s.id)) ? 'Deselect All' : 'Select All'}
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {matchingSubjects.length === 0 ? (
                  <div className="text-center py-10 text-sm text-muted-foreground border border-dashed rounded-lg">
                    {form.branches.length === 0 || form.years.length === 0
                      ? 'Select branches and years to load matching subjects.'
                      : 'No subjects match this branch / year / semester / regulation combination.'}
                  </div>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <div className="overflow-x-auto max-h-96 overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/40 text-xs uppercase text-muted-foreground sticky top-0">
                          <tr>
                            <th className="px-3 py-2 w-10"></th>
                            <th className="px-3 py-2 text-left">Code</th>
                            <th className="px-3 py-2 text-left">Subject</th>
                            <th className="px-3 py-2 text-left">Branch</th>
                            <th className="px-3 py-2 text-left">Year</th>
                            <th className="px-3 py-2 text-left">Sem</th>
                            <th className="px-3 py-2 text-left">Credits</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {matchingSubjects.map(s => (
                            <tr key={s.id} className="hover:bg-muted/20">
                              <td className="px-3 py-2">
                                <Checkbox checked={form.selectedSubjectIds.includes(s.id)} onCheckedChange={() => toggleArr('selectedSubjectIds', s.id)} />
                              </td>
                              <td className="px-3 py-2 font-mono text-xs">{s.subjectCode}</td>
                              <td className="px-3 py-2">{s.subjectName}</td>
                              <td className="px-3 py-2">{s.branch}</td>
                              <td className="px-3 py-2">{normYear(s.year)}</td>
                              <td className="px-3 py-2">{s.semester}</td>
                              <td className="px-3 py-2">{s.credits}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Section 3: Rules */}
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Calendar className="w-5 h-5 text-primary" /> 3. Examination Rules</CardTitle>
                <CardDescription>Scheduling constraints applied during AI schedule generation.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Minimum Gap Between Exams (days)</Label>
                    <Input type="number" min={0} max={7} value={form.rules.minGapDays}
                      onChange={e => setForm({ ...form, rules: { ...form.rules, minGapDays: parseInt(e.target.value) || 0 } })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Maximum Exams Per Day (per cohort)</Label>
                    <Input type="number" min={1} max={5} value={form.rules.maxPerDay}
                      onChange={e => setForm({ ...form, rules: { ...form.rules, maxPerDay: parseInt(e.target.value) || 1 } })} />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                  <div className="flex items-center justify-between border rounded-lg px-3 py-2">
                    <Label className="text-sm">Include Sundays</Label>
                    <Switch checked={form.rules.includeSunday} onCheckedChange={v => setForm({ ...form, rules: { ...form.rules, includeSunday: v } })} />
                  </div>
                  <div className="flex items-center justify-between border rounded-lg px-3 py-2">
                    <Label className="text-sm">Include Holidays</Label>
                    <Switch checked={form.rules.includeHolidays} onCheckedChange={v => setForm({ ...form, rules: { ...form.rules, includeHolidays: v } })} />
                  </div>
                  <div className="flex items-center justify-between border rounded-lg px-3 py-2">
                    <Label className="text-sm">Allow Parallel Exams</Label>
                    <Switch checked={form.rules.allowParallel} onCheckedChange={v => setForm({ ...form, rules: { ...form.rules, allowParallel: v } })} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar: AI Summary */}
          <div className="space-y-6">
            <Card className="shadow-sm sticky top-4">
              <CardHeader className="bg-primary/5 border-b">
                <CardTitle className="flex items-center gap-2 text-primary"><Sparkles className="w-5 h-5" /> AI Preparation Summary</CardTitle>
                <CardDescription>Live calculation from your selections.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <MetricRow icon={<Users className="w-4 h-4" />} label="Total Students" value={metrics.totalStudents} />
                <MetricRow icon={<BookOpen className="w-4 h-4" />} label="Total Subjects" value={metrics.totalSubjects} />
                <MetricRow icon={<Layers className="w-4 h-4" />} label="Total Branches" value={metrics.totalBranches} />
                <MetricRow icon={<Calendar className="w-4 h-4" />} label="Estimated Exam Days" value={metrics.estimatedDays} />

                <div className="pt-3 border-t">
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">AI Subject Classification</div>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="outline" className="text-[10px]">Common: {aiPreview.common}</Badge>
                    <Badge variant="outline" className="text-[10px]">Core: {aiPreview.core}</Badge>
                    <Badge variant="outline" className="text-[10px]">Branch: {aiPreview.branchSpec}</Badge>
                    <Badge variant="outline" className="text-[10px]">Lab: {aiPreview.lab}</Badge>
                  </div>
                </div>

                <div className="pt-4 border-t space-y-2">
                  <div className="flex flex-wrap gap-1">
                    {form.years.map(y => <Badge key={y} variant="secondary" className="text-[10px]">{y}</Badge>)}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {form.branches.map(b => <Badge key={b} variant="outline" className="text-[10px]">{b}</Badge>)}
                  </div>
                </div>

                <Button type="submit" disabled={saving} className="w-full mt-4">
                  {saving ? <><Activity className="w-4 h-4 mr-2 animate-spin" /> Creating...</> : <>Create Exam <Sparkles className="w-4 h-4 ml-2" /></>}
                </Button>
                <p className="text-[11px] text-muted-foreground text-center">Saved as <strong>DRAFT</strong>. Generate the schedule in the next step.</p>
              </CardContent>
            </Card>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}

const MetricRow = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) => (
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-2 text-sm text-muted-foreground">{icon}{label}</div>
    <div className="text-xl font-bold tabular-nums">{value}</div>
  </div>
);
