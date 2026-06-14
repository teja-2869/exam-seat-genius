import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AdminLayout } from '@/components/layout/AdminLayout';
import {
  BookOpen, Plus, Trash2, Pencil, Activity, Upload, AlertCircle, Filter, Search
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import {
  collection, query, where, getDocs, addDoc, updateDoc, doc, deleteDoc,
  serverTimestamp, writeBatch
} from 'firebase/firestore';
import { ExcelUpload } from '@/components/ui/ExcelUpload';
import { MultiSheetExcelUpload, SheetResult } from '@/components/ui/MultiSheetExcelUpload';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const YEAR_OPTIONS = ['1st', '2nd', '3rd', '4th'];
const SEMESTER_OPTIONS = ['1', '2', '3', '4', '5', '6', '7', '8'];
const EXAM_TYPES = ['Theory', 'Practical', 'Lab', 'Project', 'Viva'];
const STATUS_OPTIONS = ['Active', 'Inactive'];

interface Subject {
  id: string;
  institutionId: string;
  subjectCode: string;
  subjectName: string;
  branch: string;
  year: string;
  semester: string;
  credits: number;
  regulation: string;
  examType: string;
  status: string;
  createdAt?: any;
  deleted?: boolean;
}

const emptyForm = {
  subjectCode: '', subjectName: '', branch: '', year: '', semester: '',
  credits: '', regulation: '', examType: 'Theory', status: 'Active'
};

export default function AdminSubjects() {
  const { college, user } = useAuth();
  const institutionId = college?.id || (user as any)?.institutionId;

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [branches, setBranches] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [formData, setFormData] = useState<any>(emptyForm);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [fBranch, setFBranch] = useState('all');
  const [fYear, setFYear] = useState('all');
  const [fSem, setFSem] = useState('all');
  const [fReg, setFReg] = useState('all');
  const [fExam, setFExam] = useState('all');
  const [fStatus, setFStatus] = useState('all');

  const fetchAll = async () => {
    if (!institutionId) { setLoading(false); return; }
    setLoading(true);
    try {
      const [subSnap, brSnap] = await Promise.all([
        getDocs(query(collection(db, 'subjects'), where('institutionId', '==', institutionId))),
        getDocs(query(collection(db, 'branches'), where('institutionId', '==', institutionId))),
      ]);
      const subs = subSnap.docs
        .map(d => ({ id: d.id, ...(d.data() as any) } as Subject))
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
      if (fBranch !== 'all' && s.branch !== fBranch) return false;
      if (fYear !== 'all' && s.year !== fYear) return false;
      if (fSem !== 'all' && String(s.semester) !== fSem) return false;
      if (fReg !== 'all' && s.regulation !== fReg) return false;
      if (fExam !== 'all' && s.examType !== fExam) return false;
      if (fStatus !== 'all' && s.status !== fStatus) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!s.subjectCode?.toLowerCase().includes(q) &&
            !s.subjectName?.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [subjects, fBranch, fYear, fSem, fReg, fExam, fStatus, search]);

  const openAdd = () => {
    setEditingId(null);
    setFormData(emptyForm);
    setShowForm(true);
  };

  const openEdit = (s: Subject) => {
    setEditingId(s.id);
    setFormData({
      subjectCode: s.subjectCode, subjectName: s.subjectName, branch: s.branch,
      year: s.year, semester: String(s.semester), credits: String(s.credits ?? ''),
      regulation: s.regulation, examType: s.examType, status: s.status
    });
    setShowForm(true);
  };

  const validateForm = () => {
    if (!formData.subjectCode.trim()) return 'Subject Code is required';
    if (!formData.subjectName.trim()) return 'Subject Name is required';
    if (!formData.branch) return 'Branch is required';
    if (!formData.year) return 'Year is required';
    // duplicate check
    const dup = subjects.find(s =>
      s.subjectCode?.toLowerCase() === formData.subjectCode.trim().toLowerCase() &&
      s.id !== editingId
    );
    if (dup) return 'Subject Code already exists for this institution';
    return null;
  };

  const handleSave = async () => {
    const err = validateForm();
    if (err) { toast({ title: err, variant: 'destructive' }); return; }
    if (!institutionId) return;
    setSaving(true);
    try {
      const payload = {
        institutionId,
        subjectCode: formData.subjectCode.trim(),
        subjectName: formData.subjectName.trim(),
        branch: formData.branch,
        year: formData.year,
        semester: String(formData.semester || ''),
        credits: Number(formData.credits) || 0,
        regulation: formData.regulation?.trim() || '',
        examType: formData.examType || 'Theory',
        status: formData.status || 'Active',
      };
      if (editingId) {
        await updateDoc(doc(db, 'subjects', editingId), payload);
        toast({ title: 'Subject updated' });
      } else {
        await addDoc(collection(db, 'subjects'), {
          ...payload, createdBy: (user as any)?.uid || null, createdAt: serverTimestamp()
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
      // Soft delete
      await updateDoc(doc(db, 'subjects', confirmDelete), { deleted: true, status: 'Inactive' });
      toast({ title: 'Subject removed' });
      setConfirmDelete(null);
      fetchAll();
    } catch (e: any) {
      toast({ title: 'Delete failed', description: e.message, variant: 'destructive' });
    }
  };

  // Excel upload
  const templateHeaders = [
    'Subject Code', 'Subject Name', 'Branch', 'Year', 'Semester',
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
  const requiredFields = ['subjectCode', 'subjectName', 'branch', 'year'];
  const previewColumns = [
    { key: 'subjectCode', label: 'Code' },
    { key: 'subjectName', label: 'Name' },
    { key: 'branch', label: 'Branch' },
    { key: 'year', label: 'Year' },
    { key: 'semester', label: 'Sem' },
    { key: 'credits', label: 'Credits' },
    { key: 'regulation', label: 'Reg' },
    { key: 'examType', label: 'Exam Type' },
    { key: 'status', label: 'Status' },
  ];

  const handleBulkUpload = async () => {
    if (!institutionId || previewData.length === 0) return;
    setUploadLoading(true);
    try {
      const existingCodes = new Set(subjects.map(s => s.subjectCode?.toLowerCase()));
      const valid = previewData.filter(r => {
        const code = r.subjectCode?.trim().toLowerCase();
        if (!code) return false;
        if (existingCodes.has(code)) return false;
        existingCodes.add(code);
        return true;
      });
      if (valid.length === 0) {
        toast({ title: 'No new subjects', description: 'All rows are duplicates or invalid.', variant: 'destructive' });
        setUploadLoading(false); return;
      }
      const batch = writeBatch(db);
      valid.forEach(r => {
        const ref = doc(collection(db, 'subjects'));
        batch.set(ref, {
          institutionId,
          subjectCode: r.subjectCode.trim(),
          subjectName: r.subjectName.trim(),
          branch: r.branch.trim(),
          year: r.year.trim(),
          semester: String(r.semester || '').trim(),
          credits: Number(r.credits) || 0,
          regulation: r.regulation?.trim() || '',
          examType: r.examType?.trim() || 'Theory',
          status: r.status?.trim() || 'Active',
          createdBy: (user as any)?.uid || null,
          createdAt: serverTimestamp(),
        });
      });
      await batch.commit();
      toast({ title: `${valid.length} subjects uploaded`, description: `${previewData.length - valid.length} skipped as duplicates.` });
      setPreviewData([]); setShowUpload(false); fetchAll();
    } catch (e: any) {
      console.error(e);
      toast({ title: 'Upload failed', description: e.message, variant: 'destructive' });
    } finally { setUploadLoading(false); }
  };

  // ---------- Multi-sheet upload ----------
  const handleMultiSheetUpload = async (sheetResults: SheetResult[]) => {
    if (!institutionId) return;
    setUploadLoading(true);
    try {
      const existingCodes = new Set(subjects.map(s => s.subjectCode?.toLowerCase()));
      const batch = writeBatch(db);
      let inserted = 0;
      let duplicates = 0;
      const perSheet: Record<string, number> = {};

      sheetResults.forEach(sheet => {
        if (!sheet.validRows || sheet.validRows.length === 0) return;
        sheet.validRows.forEach(r => {
          const code = String(r.subjectCode || '').trim().toLowerCase();
          if (!code) return;
          if (existingCodes.has(code)) { duplicates++; return; }
          existingCodes.add(code);
          const ref = doc(collection(db, 'subjects'));
          batch.set(ref, {
            institutionId,
            subjectCode: String(r.subjectCode).trim(),
            subjectName: String(r.subjectName).trim(),
            branch: String(r.branch).trim(),
            year: String(r.year).trim(),
            semester: String(r.semester || '').trim(),
            credits: Number(r.credits) || 0,
            regulation: String(r.regulation || '').trim(),
            examType: String(r.examType || 'Theory').trim(),
            status: String(r.status || 'Active').trim(),
            sourceSheet: sheet.sheetName,
            createdBy: (user as any)?.uid || null,
            createdAt: serverTimestamp(),
          });
          inserted++;
          perSheet[sheet.sheetName] = (perSheet[sheet.sheetName] || 0) + 1;
        });
      });

      if (inserted === 0) {
        toast({ title: 'Nothing to upload', description: 'All rows were duplicates or invalid.', variant: 'destructive' });
        setUploadLoading(false);
        return;
      }

      await batch.commit();
      const breakdown = Object.entries(perSheet).map(([k, v]) => `${k}: ${v}`).join(' · ');
      toast({
        title: `${inserted} subjects uploaded across ${Object.keys(perSheet).length} sheet(s)`,
        description: `${breakdown}${duplicates ? ` · ${duplicates} duplicate(s) skipped` : ''}`,
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
              <span className="text-foreground font-medium">Subject Management</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground mb-2">
              Subject Registry
            </h1>
            <p className="text-muted-foreground flex items-center gap-2">
              <BookOpen className="w-4 h-4" /> Master source for exams, seating, and academic mapping.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={openAdd}><Plus className="w-4 h-4 mr-2" /> Add Subject</Button>
            <Button variant="outline" onClick={() => setShowUpload(true)}>
              <Upload className="w-4 h-4 mr-2" /> Upload Excel
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="dashboard-card">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <Filter className="w-4 h-4" /> Filters
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3">
              <div className="lg:col-span-1 col-span-2 relative">
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
              <Select value={fYear} onValueChange={setFYear}>
                <SelectTrigger><SelectValue placeholder="Year" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Years</SelectItem>
                  {YEAR_OPTIONS.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
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
              <Select value={fStatus} onValueChange={setFStatus}>
                <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  {STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
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
                    <th className="px-4 py-3">Branch</th>
                    <th className="px-4 py-3">Year</th>
                    <th className="px-4 py-3">Sem</th>
                    <th className="px-4 py-3">Credits</th>
                    <th className="px-4 py-3">Regulation</th>
                    <th className="px-4 py-3">Exam Type</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map(s => (
                    <tr key={s.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3 font-semibold">{s.subjectCode}</td>
                      <td className="px-4 py-3">{s.subjectName}</td>
                      <td className="px-4 py-3">{s.branch}</td>
                      <td className="px-4 py-3">{s.year}</td>
                      <td className="px-4 py-3">{s.semester}</td>
                      <td className="px-4 py-3">{s.credits}</td>
                      <td className="px-4 py-3">{s.regulation || '-'}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 text-[10px] font-bold uppercase rounded-md bg-primary/10 text-primary">{s.examType}</span>
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
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Add/Edit Dialog */}
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Edit Subject' : 'Add Subject'}</DialogTitle>
              <DialogDescription>All fields scoped to your institution.</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4 max-h-[60vh] overflow-y-auto px-1">
              <div className="space-y-2">
                <Label>Subject Code *</Label>
                <Input value={formData.subjectCode} onChange={e => setFormData({ ...formData, subjectCode: e.target.value })} placeholder="e.g., CS301" />
              </div>
              <div className="space-y-2">
                <Label>Subject Name *</Label>
                <Input value={formData.subjectName} onChange={e => setFormData({ ...formData, subjectName: e.target.value })} placeholder="e.g., Database Management Systems" />
              </div>
              <div className="space-y-2">
                <Label>Branch *</Label>
                <Select value={formData.branch} onValueChange={v => setFormData({ ...formData, branch: v })}>
                  <SelectTrigger><SelectValue placeholder="Select branch" /></SelectTrigger>
                  <SelectContent>
                    {branches.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Year *</Label>
                <Select value={formData.year} onValueChange={v => setFormData({ ...formData, year: v })}>
                  <SelectTrigger><SelectValue placeholder="Select year" /></SelectTrigger>
                  <SelectContent>
                    {YEAR_OPTIONS.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Semester</Label>
                <Select value={formData.semester} onValueChange={v => setFormData({ ...formData, semester: v })}>
                  <SelectTrigger><SelectValue placeholder="Select semester" /></SelectTrigger>
                  <SelectContent>
                    {SEMESTER_OPTIONS.map(s => <SelectItem key={s} value={s}>Sem {s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Credits</Label>
                <Input type="number" value={formData.credits} onChange={e => setFormData({ ...formData, credits: e.target.value })} placeholder="e.g., 4" />
              </div>
              <div className="space-y-2">
                <Label>Regulation</Label>
                <Input value={formData.regulation} onChange={e => setFormData({ ...formData, regulation: e.target.value })} placeholder="e.g., R20" />
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
              <div className="space-y-2 sm:col-span-2">
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={v => setFormData({ ...formData, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
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
              <DialogDescription>Download the template, fill in details, then upload.</DialogDescription>
            </DialogHeader>
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
          </DialogContent>
        </Dialog>

        {/* Delete confirm */}
        <Dialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Confirm Subject Removal</DialogTitle></DialogHeader>
            <div className="py-4">
              <div className="flex gap-4 p-4 bg-destructive/10 text-destructive rounded-lg items-start">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p className="text-sm">This subject will be soft-deleted and marked inactive. Exam mappings using this subject may be affected.</p>
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
