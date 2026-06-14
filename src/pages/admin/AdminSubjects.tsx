import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AdminLayout } from '@/components/layout/AdminLayout';
import {
  BookOpen, Plus, Trash2, Pencil, Activity, Upload, AlertCircle, Filter, Search,
  X, GitMerge, Layers
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import {
  collection, query, where, getDocs, addDoc, updateDoc, doc,
  serverTimestamp, writeBatch
} from 'firebase/firestore';
import { ExcelUpload } from '@/components/ui/ExcelUpload';
import { MultiSheetExcelUpload, SheetResult } from '@/components/ui/MultiSheetExcelUpload';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Offering, getOfferings, offeringBranches, mergeOfferings, classifyCategory,
  isCommonSubject, subjectKey, semesterToYear, normCode, normName
} from '@/lib/subjectUtils';

const SEMESTER_OPTIONS = ['1', '2', '3', '4', '5', '6', '7', '8'];
const EXAM_TYPES = ['Theory', 'Practical', 'Lab', 'Project', 'Viva'];
const STATUS_OPTIONS = ['Active', 'Inactive'];
const CATEGORY_OPTIONS = ['All', 'Common Subject', 'Core Subject', 'Branch Specific', 'Lab Subject', 'Project', 'Supplementary'];

interface SubjectDoc {
  id: string;
  institutionId: string;
  subjectCode: string;
  subjectName: string;
  credits: number;
  regulation: string;
  examType: string;
  status: string;
  offeredTo?: Offering[];
  // legacy
  branch?: string;
  year?: string;
  semester?: string;
  deleted?: boolean;
}

const emptyForm = () => ({
  subjectCode: '',
  subjectName: '',
  credits: '',
  regulation: '',
  examType: 'Theory',
  status: 'Active',
  offeredTo: [] as Offering[],
});

export default function AdminSubjects() {
  const { college, user } = useAuth();
  const institutionId = college?.id || (user as any)?.institutionId;

  const [subjects, setSubjects] = useState<SubjectDoc[]>([]);
  const [branches, setBranches] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [formData, setFormData] = useState<any>(emptyForm());
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [consolidating, setConsolidating] = useState(false);

  // mapping row draft (form)
  const [draftBranch, setDraftBranch] = useState('');
  const [draftSem, setDraftSem] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [fBranch, setFBranch] = useState('all');
  const [fSem, setFSem] = useState('all');
  const [fReg, setFReg] = useState('all');
  const [fExam, setFExam] = useState('all');
  const [fStatus, setFStatus] = useState('all');
  const [fCategory, setFCategory] = useState('All');
  const [fCommon, setFCommon] = useState('all');

  const fetchAll = async () => {
    if (!institutionId) { setLoading(false); return; }
    setLoading(true);
    try {
      const [subSnap, brSnap] = await Promise.all([
        getDocs(query(collection(db, 'subjects'), where('institutionId', '==', institutionId))),
        getDocs(query(collection(db, 'branches'), where('institutionId', '==', institutionId))),
      ]);
      const subs = subSnap.docs
        .map(d => ({ id: d.id, ...(d.data() as any) } as SubjectDoc))
        .filter(s => !s.deleted);
      setSubjects(subs);
      setBranches(brSnap.docs.map(d => (d.data() as any).branchName).filter(Boolean));
    } catch (err) {
      console.error(err);
      toast({ title: 'Failed to load subjects', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); /* eslint-disable-next-line */ }, [institutionId]);

  const regulationOptions = useMemo(
    () => Array.from(new Set(subjects.map(s => s.regulation).filter(Boolean))),
    [subjects]
  );

  const filtered = useMemo(() => {
    return subjects.filter(s => {
      const offs = getOfferings(s);
      if (fBranch !== 'all' && !offs.some(o => o.branch === fBranch)) return false;
      if (fSem !== 'all' && !offs.some(o => String(o.semester) === fSem)) return false;
      if (fReg !== 'all' && s.regulation !== fReg) return false;
      if (fExam !== 'all' && s.examType !== fExam) return false;
      if (fStatus !== 'all' && s.status !== fStatus) return false;
      if (fCategory !== 'All' && classifyCategory(s) !== fCategory) return false;
      if (fCommon === 'yes' && !isCommonSubject(s)) return false;
      if (fCommon === 'no' && isCommonSubject(s)) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!s.subjectCode?.toLowerCase().includes(q) &&
            !s.subjectName?.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [subjects, fBranch, fSem, fReg, fExam, fStatus, fCategory, fCommon, search]);

  // ----- Stats -----
  const stats = useMemo(() => ({
    total: subjects.length,
    common: subjects.filter(isCommonSubject).length,
    branches: new Set(subjects.flatMap(s => offeringBranches(s))).size,
  }), [subjects]);

  // ----- Form helpers -----
  const openAdd = () => {
    setEditingId(null);
    setFormData(emptyForm());
    setDraftBranch(''); setDraftSem('');
    setShowForm(true);
  };

  const openEdit = (s: SubjectDoc) => {
    setEditingId(s.id);
    setFormData({
      subjectCode: s.subjectCode,
      subjectName: s.subjectName,
      credits: String(s.credits ?? ''),
      regulation: s.regulation || '',
      examType: s.examType || 'Theory',
      status: s.status || 'Active',
      offeredTo: getOfferings(s),
    });
    setDraftBranch(''); setDraftSem('');
    setShowForm(true);
  };

  const addMapping = () => {
    if (!draftBranch || !draftSem) {
      toast({ title: 'Select branch and semester', variant: 'destructive' });
      return;
    }
    const dup = formData.offeredTo.some((o: Offering) => o.branch === draftBranch && o.semester === draftSem);
    if (dup) { toast({ title: 'Mapping already added', variant: 'destructive' }); return; }
    setFormData({
      ...formData,
      offeredTo: [...formData.offeredTo, { branch: draftBranch, semester: draftSem, year: semesterToYear(draftSem) }],
    });
    setDraftBranch(''); setDraftSem('');
  };

  const removeMapping = (i: number) => {
    setFormData({ ...formData, offeredTo: formData.offeredTo.filter((_: any, idx: number) => idx !== i) });
  };

  const validateForm = () => {
    if (!formData.subjectCode.trim()) return 'Subject Code is required';
    if (!formData.subjectName.trim()) return 'Subject Name is required';
    if (!formData.offeredTo.length) return 'Add at least one Branch → Semester mapping';
    const code = formData.subjectCode.trim().toLowerCase();
    const dup = subjects.find(s => s.subjectCode?.toLowerCase() === code && s.id !== editingId);
    if (dup) return 'Subject Code already exists. Edit the existing record to add more branches.';
    return null;
  };

  const handleSave = async () => {
    const err = validateForm();
    if (err) { toast({ title: err, variant: 'destructive' }); return; }
    if (!institutionId) return;
    setSaving(true);
    try {
      const offeredTo: Offering[] = formData.offeredTo;
      const payload: any = {
        institutionId,
        subjectCode: formData.subjectCode.trim(),
        subjectName: formData.subjectName.trim(),
        credits: Number(formData.credits) || 0,
        regulation: formData.regulation?.trim() || '',
        examType: formData.examType || 'Theory',
        status: formData.status || 'Active',
        offeredTo,
        isCommonSubject: offeringBranches({ offeredTo } as any).length >= 2,
        // legacy mirror (first offering) for backward compatibility
        branch: offeredTo[0]?.branch || '',
        year: offeredTo[0]?.year || '',
        semester: offeredTo[0]?.semester || '',
      };
      if (editingId) {
        await updateDoc(doc(db, 'subjects', editingId), payload);
        toast({ title: 'Subject updated' });
      } else {
        await addDoc(collection(db, 'subjects'), {
          ...payload,
          createdBy: (user as any)?.uid || null,
          createdAt: serverTimestamp(),
        });
        toast({ title: 'Subject added' });
      }
      setShowForm(false);
      fetchAll();
    } catch (e: any) {
      console.error(e);
      toast({ title: 'Save failed', description: e.message, variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await updateDoc(doc(db, 'subjects', confirmDelete), { deleted: true, status: 'Inactive' });
      toast({ title: 'Subject removed' });
      setConfirmDelete(null);
      fetchAll();
    } catch (e: any) {
      toast({ title: 'Delete failed', description: e.message, variant: 'destructive' });
    }
  };

  // ---------- Consolidate duplicates (legacy migration) ----------
  const handleConsolidate = async () => {
    if (!institutionId) return;
    setConsolidating(true);
    try {
      const groups: Record<string, SubjectDoc[]> = {};
      subjects.forEach(s => {
        const k = subjectKey(s);
        if (!k) return;
        (groups[k] = groups[k] || []).push(s);
      });
      const dupGroups = Object.values(groups).filter(g => g.length > 1);
      if (dupGroups.length === 0) {
        toast({ title: 'No duplicates found' });
        setConsolidating(false);
        return;
      }
      const batch = writeBatch(db);
      let merged = 0;
      for (const group of dupGroups) {
        // Keep earliest (or first); merge offerings of others into it; soft-delete others.
        group.sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));
        const keeper = group[0];
        let combined: Offering[] = getOfferings(keeper);
        for (let i = 1; i < group.length; i++) {
          combined = mergeOfferings(combined, getOfferings(group[i]));
          batch.update(doc(db, 'subjects', group[i].id), { deleted: true, status: 'Inactive' });
          merged++;
        }
        batch.update(doc(db, 'subjects', keeper.id), {
          offeredTo: combined,
          isCommonSubject: combined.map(o => o.branch).filter((v, i, a) => a.indexOf(v) === i).length >= 2,
          branch: combined[0]?.branch || '',
          year: combined[0]?.year || '',
          semester: combined[0]?.semester || '',
        });
      }
      await batch.commit();
      toast({ title: `Consolidated ${merged} duplicate record(s)` });
      fetchAll();
    } catch (e: any) {
      console.error(e);
      toast({ title: 'Consolidation failed', description: e.message, variant: 'destructive' });
    } finally {
      setConsolidating(false);
    }
  };

  // Excel upload
  const templateHeaders = [
    'Subject Code', 'Subject Name', 'Branch', 'Semester',
    'Credits', 'Regulation', 'Exam Type', 'Status'
  ];
  const schemaMapping: Record<string, string> = {
    'Subject Code': 'subjectCode',
    'Subject Name': 'subjectName',
    'Branch': 'branch',
    'Year': 'year',
    'Semester': 'semester',
    'Credits': 'credits',
    'Regulation': 'regulation',
    'Exam Type': 'examType',
    'Status': 'status',
  };
  const requiredFields = ['subjectCode', 'subjectName', 'branch', 'semester'];
  const previewColumns = [
    { key: 'subjectCode', label: 'Code' },
    { key: 'subjectName', label: 'Name' },
    { key: 'branch', label: 'Branch' },
    { key: 'semester', label: 'Sem' },
    { key: 'credits', label: 'Credits' },
    { key: 'regulation', label: 'Reg' },
    { key: 'examType', label: 'Exam Type' },
    { key: 'status', label: 'Status' },
  ];

  /** Merge rows into existing+new map keyed by subjectKey; deduplicates branch+sem within offerings. */
  const mergeRowsIntoCatalog = (rows: any[]) => {
    const map = new Map<string, { existing: SubjectDoc | null; payload: any; offerings: Offering[] }>();
    subjects.forEach(s => {
      const k = subjectKey(s);
      if (!k) return;
      map.set(k, {
        existing: s,
        payload: {
          subjectCode: s.subjectCode,
          subjectName: s.subjectName,
          credits: s.credits || 0,
          regulation: s.regulation || '',
          examType: s.examType || 'Theory',
          status: s.status || 'Active',
        },
        offerings: getOfferings(s),
      });
    });

    rows.forEach(r => {
      const code = String(r.subjectCode || '').trim();
      const name = String(r.subjectName || '').trim();
      if (!code || !name) return;
      const branch = String(r.branch || '').trim();
      const sem = String(r.semester || '').trim();
      if (!branch || !sem) return;
      const k = normCode(code) || normName(name);
      const entry = map.get(k) || {
        existing: null,
        payload: {
          subjectCode: code,
          subjectName: name,
          credits: Number(r.credits) || 0,
          regulation: String(r.regulation || '').trim(),
          examType: String(r.examType || 'Theory').trim(),
          status: String(r.status || 'Active').trim(),
        },
        offerings: [],
      };
      entry.offerings = mergeOfferings(entry.offerings, [{
        branch, semester: sem, year: semesterToYear(sem),
      }]);
      map.set(k, entry);
    });

    return map;
  };

  const commitCatalog = async (map: ReturnType<typeof mergeRowsIntoCatalog>) => {
    const batch = writeBatch(db);
    let created = 0, updated = 0;
    map.forEach(({ existing, payload, offerings }) => {
      const isCommon = Array.from(new Set(offerings.map(o => o.branch))).length >= 2;
      const docPayload: any = {
        ...payload,
        institutionId,
        offeredTo: offerings,
        isCommonSubject: isCommon,
        branch: offerings[0]?.branch || '',
        year: offerings[0]?.year || '',
        semester: offerings[0]?.semester || '',
      };
      if (existing) {
        // Only update if offerings actually changed
        const prevKey = JSON.stringify(getOfferings(existing).map(o => `${o.branch}|${o.semester}`).sort());
        const newKey = JSON.stringify(offerings.map(o => `${o.branch}|${o.semester}`).sort());
        if (prevKey !== newKey) {
          batch.update(doc(db, 'subjects', existing.id), docPayload);
          updated++;
        }
      } else {
        const ref = doc(collection(db, 'subjects'));
        batch.set(ref, {
          ...docPayload,
          createdBy: (user as any)?.uid || null,
          createdAt: serverTimestamp(),
        });
        created++;
      }
    });
    await batch.commit();
    return { created, updated };
  };

  const handleBulkUpload = async () => {
    if (!institutionId || previewData.length === 0) return;
    setUploadLoading(true);
    try {
      const map = mergeRowsIntoCatalog(previewData);
      const { created, updated } = await commitCatalog(map);
      if (!created && !updated) {
        toast({ title: 'No changes', description: 'All rows already exist in the catalog.', variant: 'destructive' });
      } else {
        toast({ title: 'Catalog updated', description: `${created} created · ${updated} merged with new mappings.` });
      }
      setPreviewData([]); setShowUpload(false); fetchAll();
    } catch (e: any) {
      console.error(e);
      toast({ title: 'Upload failed', description: e.message, variant: 'destructive' });
    } finally { setUploadLoading(false); }
  };

  const handleMultiSheetUpload = async (sheetResults: SheetResult[]) => {
    if (!institutionId) return;
    setUploadLoading(true);
    try {
      const allRows: any[] = [];
      sheetResults.forEach(sheet => {
        (sheet.validRows || []).forEach(r => allRows.push({ ...r, _sheet: sheet.sheetName }));
      });
      if (allRows.length === 0) {
        toast({ title: 'Nothing to upload', description: 'All sheets are empty or invalid.', variant: 'destructive' });
        setUploadLoading(false);
        return;
      }
      const map = mergeRowsIntoCatalog(allRows);
      const { created, updated } = await commitCatalog(map);
      toast({
        title: `Catalog synced across ${sheetResults.length} sheet(s)`,
        description: `${created} new subjects · ${updated} merged.`,
      });
      setShowUpload(false);
      setPreviewData([]);
      fetchAll();
    } catch (e: any) {
      console.error(e);
      toast({ title: 'Multi-sheet upload failed', description: e.message, variant: 'destructive' });
    } finally {
      setUploadLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8 animate-fade-in pb-12">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
              <span>Admin</span><span>/</span><span>Academics</span><span>/</span>
              <span className="text-foreground font-medium">Master Subject Catalog</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground mb-2">
              Subject Registry
            </h1>
            <p className="text-muted-foreground flex items-center gap-2 flex-wrap">
              <BookOpen className="w-4 h-4" /> One subject · many branches.
              <span className="text-xs">·</span>
              <Badge variant="outline" className="text-[10px]">{stats.total} subjects</Badge>
              <Badge variant="outline" className="text-[10px]">{stats.common} common</Badge>
              <Badge variant="outline" className="text-[10px]">{stats.branches} branches mapped</Badge>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={openAdd}><Plus className="w-4 h-4 mr-2" /> Add Subject</Button>
            <Button variant="outline" onClick={() => setShowUpload(true)}>
              <Upload className="w-4 h-4 mr-2" /> Upload Excel
            </Button>
            <Button variant="outline" onClick={handleConsolidate} disabled={consolidating}>
              <GitMerge className="w-4 h-4 mr-2" /> {consolidating ? 'Merging...' : 'Consolidate Duplicates'}
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="dashboard-card">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <Filter className="w-4 h-4" /> Filters
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-8 gap-3">
              <div className="lg:col-span-2 col-span-2 relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input className="pl-9" placeholder="Search code/name" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <Select value={fBranch} onValueChange={setFBranch}>
                <SelectTrigger><SelectValue placeholder="Branch" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Branches</SelectItem>
                  {branches.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={fSem} onValueChange={setFSem}>
                <SelectTrigger><SelectValue placeholder="Semester" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sems</SelectItem>
                  {SEMESTER_OPTIONS.map(s => <SelectItem key={s} value={s}>Sem {s}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={fReg} onValueChange={setFReg}>
                <SelectTrigger><SelectValue placeholder="Regulation" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Regs</SelectItem>
                  {regulationOptions.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={fExam} onValueChange={setFExam}>
                <SelectTrigger><SelectValue placeholder="Exam Type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {EXAM_TYPES.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={fCategory} onValueChange={setFCategory}>
                <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={fStatus} onValueChange={setFStatus}>
                <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  {STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={fCommon} onValueChange={setFCommon}>
                <SelectTrigger><SelectValue placeholder="Common" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Common: Any</SelectItem>
                  <SelectItem value="yes">Common Only</SelectItem>
                  <SelectItem value="no">Branch Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        {loading ? (
          <div className="h-64 flex items-center justify-center border rounded-xl">
            <Activity className="animate-spin text-primary w-8 h-8" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center border rounded-xl text-muted-foreground bg-muted/20">
            <BookOpen className="w-12 h-12 mb-4 opacity-50" />
            <p>No subjects found.</p>
          </div>
        ) : (
          <div className="border rounded-xl overflow-hidden bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground bg-muted/40 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="px-4 py-3">Code</th>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Credits</th>
                    <th className="px-4 py-3">Regulation</th>
                    <th className="px-4 py-3">Exam Type</th>
                    <th className="px-4 py-3 min-w-[260px]">Offered To</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map(s => {
                    const offs = getOfferings(s);
                    const cat = classifyCategory(s);
                    const common = isCommonSubject(s);
                    return (
                      <tr key={s.id} className="hover:bg-muted/30">
                        <td className="px-4 py-3 font-semibold">{s.subjectCode}</td>
                        <td className="px-4 py-3">{s.subjectName}</td>
                        <td className="px-4 py-3">{s.credits}</td>
                        <td className="px-4 py-3">{s.regulation || '-'}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-1 text-[10px] font-bold uppercase rounded-md bg-primary/10 text-primary">{s.examType}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {offs.length === 0 && <span className="text-xs text-muted-foreground">—</span>}
                            {offs.map((o, i) => (
                              <Badge key={i} variant="outline" className="text-[10px] font-normal">
                                {o.branch} <span className="text-muted-foreground ml-1">Sem {o.semester}</span>
                              </Badge>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={common ? 'default' : 'secondary'} className="text-[10px]">
                            {cat}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded-md ${s.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{s.status}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(s)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={() => setConfirmDelete(s.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Add/Edit Dialog */}
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Edit Subject' : 'Add Subject'}</DialogTitle>
              <DialogDescription>Add the subject once, then map it to any number of branch + semester combinations.</DialogDescription>
            </DialogHeader>
            <div className="space-y-5 py-2 max-h-[70vh] overflow-y-auto px-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Subject Code *</Label>
                  <Input value={formData.subjectCode} onChange={e => setFormData({ ...formData, subjectCode: e.target.value })} placeholder="e.g., UHV101" />
                </div>
                <div className="space-y-2">
                  <Label>Subject Name *</Label>
                  <Input value={formData.subjectName} onChange={e => setFormData({ ...formData, subjectName: e.target.value })} placeholder="e.g., Universal Human Values" />
                </div>
                <div className="space-y-2">
                  <Label>Credits</Label>
                  <Input type="number" value={formData.credits} onChange={e => setFormData({ ...formData, credits: e.target.value })} placeholder="e.g., 4" />
                </div>
                <div className="space-y-2">
                  <Label>Regulation</Label>
                  <Input value={formData.regulation} onChange={e => setFormData({ ...formData, regulation: e.target.value })} placeholder="e.g., R23" />
                </div>
                <div className="space-y-2">
                  <Label>Exam Type</Label>
                  <Select value={formData.examType} onValueChange={v => setFormData({ ...formData, examType: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {EXAM_TYPES.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={formData.status} onValueChange={v => setFormData({ ...formData, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Branch-Semester mapping */}
              <div className="space-y-3 border-t pt-4">
                <Label className="flex items-center gap-2"><Layers className="w-4 h-4 text-primary" /> Branch → Semester Mapping *</Label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Select value={draftBranch} onValueChange={setDraftBranch}>
                    <SelectTrigger><SelectValue placeholder="Select branch" /></SelectTrigger>
                    <SelectContent>
                      {branches.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={draftSem} onValueChange={setDraftSem}>
                    <SelectTrigger><SelectValue placeholder="Select semester" /></SelectTrigger>
                    <SelectContent>
                      {SEMESTER_OPTIONS.map(s => <SelectItem key={s} value={s}>Sem {s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button type="button" variant="outline" onClick={addMapping}>
                    <Plus className="w-4 h-4 mr-2" /> Add Mapping
                  </Button>
                </div>

                {formData.offeredTo.length === 0 ? (
                  <div className="text-xs text-muted-foreground border border-dashed rounded-md p-4 text-center">
                    No mappings yet. Add at least one branch + semester.
                  </div>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                        <tr>
                          <th className="px-3 py-2 text-left">Branch</th>
                          <th className="px-3 py-2 text-left">Semester</th>
                          <th className="px-3 py-2 text-left">Year</th>
                          <th className="px-3 py-2 text-right"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {formData.offeredTo.map((o: Offering, i: number) => (
                          <tr key={i}>
                            <td className="px-3 py-2">{o.branch}</td>
                            <td className="px-3 py-2">Sem {o.semester}</td>
                            <td className="px-3 py-2 text-muted-foreground">{o.year}</td>
                            <td className="px-3 py-2 text-right">
                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeMapping(i)}>
                                <X className="w-4 h-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : (editingId ? 'Update Subject' : 'Add Subject')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Upload Dialog */}
        <Dialog open={showUpload} onOpenChange={(o) => { setShowUpload(o); if (!o) setPreviewData([]); }}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Bulk Upload Subjects</DialogTitle>
              <DialogDescription>Subjects are merged by code. Same subject across branches creates one record with multiple mappings.</DialogDescription>
            </DialogHeader>
            <Tabs defaultValue="single" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="single">Single Sheet</TabsTrigger>
                <TabsTrigger value="multi">Multi-Sheet Workbook</TabsTrigger>
              </TabsList>
              <TabsContent value="single" className="mt-4">
                <ExcelUpload
                  templateHeaders={templateHeaders}
                  templateName="subject_template.xlsx"
                  schemaMapping={schemaMapping}
                  requiredFields={requiredFields}
                  onDataParsed={setPreviewData}
                  previewData={previewData}
                  onUpload={handleBulkUpload}
                  uploadLoading={uploadLoading}
                  previewColumns={previewColumns}
                />
              </TabsContent>
              <TabsContent value="multi" className="mt-4">
                <MultiSheetExcelUpload
                  templateHeaders={templateHeaders}
                  templateName="subject_template_multisheet.xlsx"
                  sheetTemplates={['1st Year', '2nd Year', '3rd Year', '4th Year']}
                  schemaMapping={schemaMapping}
                  requiredFields={requiredFields}
                  onUpload={handleMultiSheetUpload}
                  uploadLoading={uploadLoading}
                />
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>

        {/* Delete confirm */}
        <Dialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Confirm Subject Removal</DialogTitle></DialogHeader>
            <div className="py-4">
              <div className="flex gap-4 p-4 bg-destructive/10 text-destructive rounded-lg items-start">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p className="text-sm">This subject (and all its branch mappings) will be soft-deleted. Exam sessions already using it will not be modified.</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmDelete(null)}>Cancel</Button>
              <Button variant="destructive" onClick={handleDelete}>Confirm Delete</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
