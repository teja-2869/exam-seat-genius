import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AdminLayout } from '@/components/layout/AdminLayout';
import {
  Network, Plus, Activity, ArrowLeft, Users, GraduationCap, UserCog,
  Upload, Download, AlertCircle, Trash2, Edit, UserPlus, Building2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { auth, db } from '@/lib/firebase';
import {
  collection, query, where, getDocs, addDoc, deleteDoc, doc, updateDoc,
  serverTimestamp, writeBatch
} from 'firebase/firestore';
import * as XLSX from 'xlsx';
import { useToast } from '@/hooks/use-toast';

// Color palette for branch cards — each gets a unique color
const BRANCH_COLORS = [
  '#3B82F6', '#F43F5E', '#A855F7', '#10B981', '#F59E0B',
  '#6366F1', '#EC4899', '#14B8A6', '#EF4444', '#8B5CF6',
  '#06B6D4', '#F97316', '#84CC16', '#E11D48', '#7C3AED'
];

interface BranchDoc {
  id: string;
  institutionId: string;
  branchName: string;
  branchCode: string;
  assignedBlock: string;
  intakeCapacity?: number;
  status: string;
  createdAt?: any;
}

interface HODDoc {
  id: string;
  institutionId: string;
  hodId: string;
  name: string;
  gender: string;
  email: string;
  phone: string;
  branch: string;
  assignedBlock: string;
  createdAt?: any;
}

export default function AdminBranches() {
  const { college, user } = useAuth();
  const { toast } = useToast();
  const userData = user as any;
  const institutionId = college?.id || userData?.institutionId;

  // Data state
  const [branches, setBranches] = useState<BranchDoc[]>([]);
  const [hods, setHods] = useState<HODDoc[]>([]);
  const [blocks, setBlocks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Views
  const [selectedBranch, setSelectedBranch] = useState<BranchDoc | null>(null);

  // Branch dialog
  const [showBranchDialog, setShowBranchDialog] = useState(false);
  const [branchForm, setBranchForm] = useState({
    branchName: '', branchCode: '', assignedBlock: '', intakeCapacity: '', status: 'Active'
  });
  const [branchSubmitting, setBranchSubmitting] = useState(false);
  const [branchUploadPreview, setBranchUploadPreview] = useState<any[]>([]);
  const [branchUploading, setBranchUploading] = useState(false);

  // HOD dialog
  const [showHODDialog, setShowHODDialog] = useState(false);
  const [hodForm, setHodForm] = useState({
    name: '', hodId: '', gender: '', email: '', phone: '', branch: '', assignedBlock: ''
  });
  const [hodSubmitting, setHodSubmitting] = useState(false);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'branch' | 'hod'; id: string } | null>(null);

  // Stats for detail view
  const [branchStats, setBranchStats] = useState({ faculty: 0, students: 0 });

  // ─── DATA FETCHING ───────────────────────────────────────
  const fetchAll = useCallback(async () => {
    if (!institutionId) { setLoading(false); return; }
    try {
      const [branchSnap, hodSnap, blockSnap] = await Promise.all([
        getDocs(query(collection(db, 'branches'), where('institutionId', '==', institutionId))),
        getDocs(query(collection(db, 'hods'), where('institutionId', '==', institutionId))),
        getDocs(query(collection(db, 'blocks'), where('institutionId', '==', institutionId))),
      ]);
      setBranches(branchSnap.docs.map(d => ({ id: d.id, ...d.data() } as BranchDoc)));
      setHods(hodSnap.docs.map(d => ({ id: d.id, ...d.data() } as HODDoc)));
      setBlocks(blockSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err: any) {
      console.error(err);
      toast({ title: 'Load Error', description: err?.message || 'Failed to load data.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [institutionId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Fetch branch-specific stats when detail view opens
  useEffect(() => {
    if (!selectedBranch || !institutionId) return;
    const fetchStats = async () => {
      try {
        const [fSnap, sSnap] = await Promise.all([
          getDocs(query(collection(db, 'faculty'), where('institutionId', '==', institutionId), where('department', '==', selectedBranch.branchName))),
          getDocs(query(collection(db, 'students'), where('institutionId', '==', institutionId), where('branch', '==', selectedBranch.branchName))),
        ]);
        setBranchStats({ faculty: fSnap.size, students: sSnap.size });
      } catch { setBranchStats({ faculty: 0, students: 0 }); }
    };
    fetchStats();
  }, [selectedBranch, institutionId]);

  // ─── BRANCH CRUD ─────────────────────────────────────────
  const handleCreateBranch = async () => {
    if (!institutionId || !branchForm.branchName || !branchForm.branchCode || !branchForm.assignedBlock) {
      toast({ title: 'Missing Fields', description: 'Branch name, code, and assigned block are required.', variant: 'destructive' });
      return;
    }
    setBranchSubmitting(true);
    try {
      // Duplicate check
      const dupSnap = await getDocs(query(collection(db, 'branches'),
        where('institutionId', '==', institutionId),
        where('branchName', '==', branchForm.branchName)
      ));
      if (!dupSnap.empty) {
        toast({ title: 'Duplicate', description: 'A branch with this name already exists.', variant: 'destructive' });
        return;
      }
      await addDoc(collection(db, 'branches'), {
        institutionId,
        branchName: branchForm.branchName,
        branchCode: branchForm.branchCode,
        assignedBlock: branchForm.assignedBlock,
        intakeCapacity: branchForm.intakeCapacity ? Number(branchForm.intakeCapacity) : null,
        status: branchForm.status,
        createdAt: serverTimestamp()
      });
      toast({ title: 'Success', description: 'Branch created successfully.' });
      setShowBranchDialog(false);
      setBranchForm({ branchName: '', branchCode: '', assignedBlock: '', intakeCapacity: '', status: 'Active' });
      await fetchAll();
    } catch (err: any) {
      console.error(err);
      toast({ title: 'Error', description: err?.message || 'Failed to create branch.', variant: 'destructive' });
    } finally {
      setBranchSubmitting(false);
    }
  };

  // CSV/XLSX upload
  const handleBranchFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const wb = XLSX.read(evt.target?.result, { type: 'binary' });
      const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]) as any[];
      setBranchUploadPreview(data.filter(r => r.branchName && r.branchCode && r.assignedBlock));
    };
    reader.readAsBinaryString(file);
  };

  const downloadBranchTemplate = () => {
    const tpl = [
      ['branchName', 'branchCode', 'assignedBlock', 'intakeCapacity', 'status'],
      ['Computer Science', 'CSE', 'Block-1', '120', 'Active'],
      ['Electronics', 'ECE', 'Block-2', '60', 'Active']
    ];
    const ws = XLSX.utils.aoa_to_sheet(tpl);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Branches');
    XLSX.writeFile(wb, 'branches_template.csv');
  };

  const handleBranchBulkUpload = async () => {
    if (!institutionId || branchUploadPreview.length === 0) return;
    setBranchUploading(true);
    try {
      const blockNames = blocks.map(b => b.blockNumber);
      const batch = writeBatch(db);
      let count = 0;
      for (const row of branchUploadPreview) {
        if (!blockNames.includes(String(row.assignedBlock))) continue;
        const dupSnap = await getDocs(query(collection(db, 'branches'),
          where('institutionId', '==', institutionId),
          where('branchName', '==', String(row.branchName))
        ));
        if (!dupSnap.empty) continue;
        const ref = doc(collection(db, 'branches'));
        batch.set(ref, {
          institutionId,
          branchName: String(row.branchName),
          branchCode: String(row.branchCode),
          assignedBlock: String(row.assignedBlock),
          intakeCapacity: row.intakeCapacity ? Number(row.intakeCapacity) : null,
          status: row.status || 'Active',
          createdAt: serverTimestamp()
        });
        count++;
      }
      if (count > 0) {
        await batch.commit();
        toast({ title: 'Uploaded', description: `${count} branch(es) added.` });
      } else {
        toast({ title: 'Nothing Added', description: 'All entries were duplicates or had invalid blocks.' });
      }
      setShowBranchDialog(false);
      setBranchUploadPreview([]);
      await fetchAll();
    } catch (err: any) {
      console.error(err);
      toast({ title: 'Upload Failed', description: err?.message || 'Permission denied.', variant: 'destructive' });
    } finally {
      setBranchUploading(false);
    }
  };

  // ─── HOD CRUD ────────────────────────────────────────────
  const handleCreateHOD = async () => {
    if (!institutionId || !hodForm.name || !hodForm.hodId || !hodForm.email || !hodForm.branch) {
      toast({ title: 'Missing Fields', description: 'Name, ID, Email, and Branch are required.', variant: 'destructive' });
      return;
    }
    setHodSubmitting(true);
    try {
      // Check if branch already has HOD
      const existingSnap = await getDocs(query(collection(db, 'hods'),
        where('institutionId', '==', institutionId),
        where('branch', '==', hodForm.branch)
      ));
      if (!existingSnap.empty) {
        // Update existing HOD assignment
        const existingDoc = existingSnap.docs[0];
        await updateDoc(doc(db, 'hods', existingDoc.id), {
          hodId: hodForm.hodId,
          name: hodForm.name,
          gender: hodForm.gender,
          email: hodForm.email,
          phone: hodForm.phone,
          assignedBlock: hodForm.assignedBlock,
        });
        toast({ title: 'HOD Updated', description: `HOD for ${hodForm.branch} has been reassigned.` });
      } else {
        await addDoc(collection(db, 'hods'), {
          institutionId,
          hodId: hodForm.hodId,
          name: hodForm.name,
          gender: hodForm.gender,
          email: hodForm.email,
          phone: hodForm.phone,
          branch: hodForm.branch,
          assignedBlock: hodForm.assignedBlock,
          createdAt: serverTimestamp()
        });
        toast({ title: 'HOD Assigned', description: `${hodForm.name} assigned as HOD for ${hodForm.branch}.` });
      }
      setShowHODDialog(false);
      setHodForm({ name: '', hodId: '', gender: '', email: '', phone: '', branch: '', assignedBlock: '' });
      await fetchAll();
    } catch (err: any) {
      console.error(err);
      toast({ title: 'Error', description: err?.message || 'Failed to assign HOD.', variant: 'destructive' });
    } finally {
      setHodSubmitting(false);
    }
  };

  // Auto-fill assignedBlock when branch is selected in HOD form
  const handleHODBranchSelect = (branchName: string) => {
    const branch = branches.find(b => b.branchName === branchName);
    setHodForm(prev => ({
      ...prev,
      branch: branchName,
      assignedBlock: branch?.assignedBlock || ''
    }));
  };

  // ─── DELETE ──────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const collName = deleteTarget.type === 'branch' ? 'branches' : 'hods';
      await deleteDoc(doc(db, collName, deleteTarget.id));
      toast({ title: 'Deleted', description: `${deleteTarget.type === 'branch' ? 'Branch' : 'HOD'} removed.` });
      setDeleteTarget(null);
      if (deleteTarget.type === 'branch' && selectedBranch?.id === deleteTarget.id) setSelectedBranch(null);
      await fetchAll();
    } catch (err: any) {
      console.error(err);
      toast({ title: 'Error', description: err?.message || 'Delete failed.', variant: 'destructive' });
    }
  };

  // ─── HELPERS ─────────────────────────────────────────────
  const getHODForBranch = (branchName: string) => hods.find(h => h.branch === branchName);

  // ─── RENDER ──────────────────────────────────────────────
  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto space-y-8 animate-fade-in pb-12">
        {/* Breadcrumb & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
              <span>Admin</span><span>/</span><span>Departments</span><span>/</span>
              <span className="text-foreground font-medium">Branch Management</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground mb-2">
              Branch & HOD Control
            </h1>
            <p className="text-muted-foreground">
              Manage department leadership, assign blocks, and track branch activity.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowHODDialog(true)}>
              <UserPlus className="w-4 h-4 mr-2" /> Assign HOD
            </Button>
            <Button onClick={() => setShowBranchDialog(true)}>
              <Plus className="w-4 h-4 mr-2" /> Add Branch
            </Button>
          </div>
        </div>

        {/* Main Content */}
        {loading ? (
          <div className="h-64 flex items-center justify-center border rounded-xl">
            <Activity className="animate-spin text-primary w-8 h-8" />
          </div>
        ) : selectedBranch ? (
          /* ──── DETAIL VIEW ──── */
          <BranchDetailView
            branch={selectedBranch}
            hod={getHODForBranch(selectedBranch.branchName)}
            stats={branchStats}
            onBack={() => setSelectedBranch(null)}
            onDeleteBranch={() => setDeleteTarget({ type: 'branch', id: selectedBranch.id })}
            onDeleteHOD={(id) => setDeleteTarget({ type: 'hod', id })}
            onEditHOD={() => {
              const hod = getHODForBranch(selectedBranch.branchName);
              if (hod) {
                setHodForm({
                  name: hod.name, hodId: hod.hodId, gender: hod.gender,
                  email: hod.email, phone: hod.phone,
                  branch: hod.branch, assignedBlock: hod.assignedBlock
                });
              } else {
                setHodForm(prev => ({
                  ...prev,
                  branch: selectedBranch.branchName,
                  assignedBlock: selectedBranch.assignedBlock
                }));
              }
              setShowHODDialog(true);
            }}
          />
        ) : branches.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center border rounded-xl text-muted-foreground bg-muted/20">
            <Network className="w-12 h-12 mb-4 opacity-50" />
            <p>No branches inducted yet. Click "Add Branch" to start.</p>
          </div>
        ) : (
          /* ──── GRID VIEW ──── */
          <div className="bg-[#f0f2f5] p-6 lg:p-10 rounded-2xl">
            <h2 className="text-2xl font-bold text-[#1a1c1e] mb-8">Branches</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
              {branches
                .sort((a, b) => a.branchName.localeCompare(b.branchName))
                .map((branch, idx) => {
                  const color = BRANCH_COLORS[idx % BRANCH_COLORS.length];
                  const hod = getHODForBranch(branch.branchName);
                  return (
                    <button
                      key={branch.id}
                      onClick={() => setSelectedBranch(branch)}
                      className="bg-white rounded-2xl shadow-sm border border-transparent hover:border-primary transition-all flex flex-col relative overflow-hidden group text-left"
                    >
                      <div className="py-8 w-full flex items-center justify-center">
                        <span className="text-lg font-bold text-[#1a1c1e] group-hover:scale-105 transition-transform text-center px-2">
                          {branch.branchName}
                        </span>
                      </div>
                      <div className="h-1 w-3/4 mx-auto rounded-full" style={{ backgroundColor: color }} />
                      <div className="text-[10px] text-muted-foreground uppercase py-3 w-full text-center truncate px-2">
                        {hod?.name || 'No HOD Assigned'}
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); setDeleteTarget({ type: 'branch', id: branch.id }); }}
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-2 text-red-500 hover:bg-red-50 rounded-full transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </button>
                  );
                })}
            </div>
          </div>
        )}

        {/* ──── ADD BRANCH DIALOG ──── */}
        <Dialog open={showBranchDialog} onOpenChange={setShowBranchDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>Add New Branch</DialogTitle></DialogHeader>
            <Tabs defaultValue="manual" className="w-full mt-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="manual">Manual Entry</TabsTrigger>
                <TabsTrigger value="upload">Upload CSV / Excel</TabsTrigger>
              </TabsList>

              <TabsContent value="manual" className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Branch Name <span className="text-red-500">*</span></Label>
                  <Input placeholder="e.g., Computer Science" value={branchForm.branchName}
                    onChange={e => setBranchForm(p => ({ ...p, branchName: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Branch Code <span className="text-red-500">*</span></Label>
                  <Input placeholder="e.g., CSE" value={branchForm.branchCode}
                    onChange={e => setBranchForm(p => ({ ...p, branchCode: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Assigned Block <span className="text-red-500">*</span></Label>
                  <Select value={branchForm.assignedBlock} onValueChange={v => setBranchForm(p => ({ ...p, assignedBlock: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select a block" /></SelectTrigger>
                    <SelectContent>
                      {blocks.sort((a, b) => {
                        const numA = parseInt(String(a.blockNumber).replace(/\D/g, '')) || 0;
                        const numB = parseInt(String(b.blockNumber).replace(/\D/g, '')) || 0;
                        return numA - numB;
                      }).map(b => (
                        <SelectItem key={b.id} value={b.blockNumber}>{b.blockNumber} — {b.blockName || 'Unnamed'}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Intake Capacity</Label>
                  <Input type="number" placeholder="e.g., 120" value={branchForm.intakeCapacity}
                    onChange={e => setBranchForm(p => ({ ...p, intakeCapacity: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={branchForm.status} onValueChange={v => setBranchForm(p => ({ ...p, status: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowBranchDialog(false)} disabled={branchSubmitting}>Cancel</Button>
                  <Button onClick={handleCreateBranch} disabled={branchSubmitting}>
                    {branchSubmitting ? 'Saving...' : 'Create Branch'}
                  </Button>
                </DialogFooter>
              </TabsContent>

              <TabsContent value="upload" className="space-y-4 py-4">
                <div className="p-6 border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-center bg-muted/20">
                  <Upload className="w-8 h-8 text-muted-foreground mb-4" />
                  <h3 className="font-semibold mb-1">Upload Branch Data</h3>
                  <p className="text-sm text-muted-foreground mb-4">Supports .csv or .xlsx files</p>
                  <Input type="file" accept=".csv,.xlsx" className="max-w-xs cursor-pointer" onChange={handleBranchFileUpload} />
                </div>
                <div className="flex justify-between items-center bg-blue-50/50 p-4 rounded-lg border border-blue-100">
                  <div className="text-sm text-blue-800">
                    <p className="font-semibold">Need a template?</p>
                    <p>Download our sample file to see the required format.</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={downloadBranchTemplate} className="bg-white">
                    <Download className="w-4 h-4 mr-2" /> Template
                  </Button>
                </div>
                {branchUploadPreview.length > 0 && (
                  <div className="border rounded-xl overflow-x-auto max-h-48 overflow-y-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="text-xs text-muted-foreground bg-muted/50 sticky top-0">
                        <tr>
                          <th className="px-4 py-2">Name</th>
                          <th className="px-4 py-2">Code</th>
                          <th className="px-4 py-2">Block</th>
                          <th className="px-4 py-2">Capacity</th>
                          <th className="px-4 py-2">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {branchUploadPreview.map((r, i) => (
                          <tr key={i} className="border-b">
                            <td className="px-4 py-2">{r.branchName}</td>
                            <td className="px-4 py-2">{r.branchCode}</td>
                            <td className="px-4 py-2">{r.assignedBlock}</td>
                            <td className="px-4 py-2">{r.intakeCapacity || '-'}</td>
                            <td className="px-4 py-2">{r.status || 'Active'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowBranchDialog(false)}>Cancel</Button>
                  <Button onClick={handleBranchBulkUpload} disabled={branchUploadPreview.length === 0 || branchUploading}>
                    {branchUploading ? 'Uploading...' : `Upload ${branchUploadPreview.length} Branches`}
                  </Button>
                </DialogFooter>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>

        {/* ──── ASSIGN HOD DIALOG ──── */}
        <Dialog open={showHODDialog} onOpenChange={setShowHODDialog}>
          <DialogContent>
            <DialogHeader><DialogTitle>Assign HOD</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto px-1">
              <div className="space-y-2">
                <Label>HOD Full Name <span className="text-red-500">*</span></Label>
                <Input placeholder="e.g., Dr. Alan Turing" value={hodForm.name}
                  onChange={e => setHodForm(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>HOD Official ID <span className="text-red-500">*</span></Label>
                <Input placeholder="e.g., HOD-CS-01" value={hodForm.hodId}
                  onChange={e => setHodForm(p => ({ ...p, hodId: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Gender</Label>
                <Select value={hodForm.gender} onValueChange={v => setHodForm(p => ({ ...p, gender: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Email <span className="text-red-500">*</span></Label>
                <Input type="email" placeholder="turing@college.edu" value={hodForm.email}
                  onChange={e => setHodForm(p => ({ ...p, email: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Phone Number</Label>
                <Input type="tel" placeholder="+91 XXXXX XXXXX" value={hodForm.phone}
                  onChange={e => setHodForm(p => ({ ...p, phone: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Assigned Branch <span className="text-red-500">*</span></Label>
                <Select value={hodForm.branch} onValueChange={handleHODBranchSelect}>
                  <SelectTrigger><SelectValue placeholder="Select branch" /></SelectTrigger>
                  <SelectContent>
                    {branches.map(b => (
                      <SelectItem key={b.id} value={b.branchName}>{b.branchName} ({b.branchCode})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Assigned Block (auto)</Label>
                <Input value={hodForm.assignedBlock} readOnly className="bg-muted/50" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowHODDialog(false)} disabled={hodSubmitting}>Cancel</Button>
              <Button onClick={handleCreateHOD} disabled={hodSubmitting}>
                {hodSubmitting ? 'Saving...' : 'Assign HOD'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ──── DELETE CONFIRMATION ──── */}
        <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Confirm Deletion</DialogTitle></DialogHeader>
            <div className="py-4">
              <div className="flex gap-4 p-4 bg-destructive/10 text-destructive rounded-lg items-start">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p className="text-sm">
                  {deleteTarget?.type === 'branch'
                    ? 'Deleting this branch will not remove associated HOD records. Are you sure?'
                    : 'Are you sure you want to remove this HOD assignment?'}
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
              <Button variant="destructive" onClick={handleDelete}>Confirm</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}

// ─── BRANCH DETAIL VIEW COMPONENT ──────────────────────────
interface BranchDetailProps {
  branch: BranchDoc;
  hod?: HODDoc;
  stats: { faculty: number; students: number };
  onBack: () => void;
  onDeleteBranch: () => void;
  onDeleteHOD: (id: string) => void;
  onEditHOD: () => void;
}

function BranchDetailView({ branch, hod, stats, onBack, onDeleteBranch, onDeleteHOD, onEditHOD }: BranchDetailProps) {
  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={onBack}><ArrowLeft className="w-5 h-5" /></Button>
        <h2 className="text-2xl font-bold text-foreground">{branch.branchName}</h2>
        <span className={`px-3 py-1 text-xs font-semibold rounded-full ${branch.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {branch.status}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-sm border-l-4" style={{ borderLeftColor: '#3B82F6' }}>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">Branch Code</p>
            <p className="text-xl font-bold">{branch.branchCode}</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-l-4" style={{ borderLeftColor: '#10B981' }}>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">Assigned Block</p>
            <p className="text-xl font-bold">{branch.assignedBlock}</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-l-4" style={{ borderLeftColor: '#F59E0B' }}>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">Faculty Count</p>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-amber-500" />
              <span className="text-xl font-bold">{stats.faculty}</span>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-l-4" style={{ borderLeftColor: '#A855F7' }}>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">Student Count</p>
            <div className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-purple-500" />
              <span className="text-xl font-bold">{stats.students}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* HOD Section */}
      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2"><UserCog className="w-5 h-5 text-primary" /> Head of Department</CardTitle>
          <Button size="sm" variant="outline" onClick={onEditHOD}>
            {hod ? <><Edit className="w-4 h-4 mr-1" /> Edit</> : <><UserPlus className="w-4 h-4 mr-1" /> Assign</>}
          </Button>
        </CardHeader>
        <CardContent>
          {hod ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground uppercase">Name</p>
                <p className="font-semibold">{hod.name}</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground uppercase">HOD ID</p>
                <p className="font-semibold">{hod.hodId}</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground uppercase">Email</p>
                <p className="font-semibold truncate">{hod.email}</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground uppercase">Phone</p>
                <p className="font-semibold">{hod.phone || 'N/A'}</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground uppercase">Gender</p>
                <p className="font-semibold">{hod.gender || 'N/A'}</p>
              </div>
              <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
                <p className="text-xs text-primary uppercase">Assigned Block</p>
                <p className="font-bold text-primary">{hod.assignedBlock}</p>
              </div>
              <div className="sm:col-span-2 flex justify-end">
                <Button variant="ghost" size="sm" className="text-destructive" onClick={() => onDeleteHOD(hod.id)}>
                  <Trash2 className="w-4 h-4 mr-1" /> Remove HOD
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground bg-muted/20 rounded-lg">
              No HOD assigned to this branch yet.
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button variant="destructive" size="sm" onClick={onDeleteBranch}>
          <Trash2 className="w-4 h-4 mr-1" /> Delete Branch
        </Button>
      </div>
    </div>
  );
}
