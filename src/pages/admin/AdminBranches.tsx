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

const BRANCH_COLORS = [
  '#3B82F6', '#F43F5E', '#A855F7', '#10B981', '#F59E0B',
  '#6366F1', '#EC4899', '#14B8A6', '#EF4444', '#8B5CF6',
  '#06B6D4', '#F97316', '#84CC16', '#E11D48', '#7C3AED'
];

interface BranchDoc {
  id: string;
  institutionId: string;
  branchName: string;
  assignedBlock: string;
  createdAt?: any;
}

interface HODDoc {
  id: string;
  institutionId: string;
  hodId: string;
  name: string;
  gender: string;
  email: string;
  phoneNumber: string;
  branch: string;
  assignedBlock: string;
  status: string;
  createdAt?: any;
}

export default function AdminBranches() {
  const { college, user } = useAuth();
  const { toast } = useToast();
  const userData = user as any;
  const institutionId = college?.id || userData?.institutionId;

  const [branches, setBranches] = useState<BranchDoc[]>([]);
  const [hods, setHods] = useState<HODDoc[]>([]);
  const [blocks, setBlocks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBranch, setSelectedBranch] = useState<BranchDoc | null>(null);

  // HOD Upload dialog
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [hodUploadPreview, setHodUploadPreview] = useState<any[]>([]);
  const [hodUploading, setHodUploading] = useState(false);

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

  // ─── HOD EXCEL UPLOAD (AUTO-CREATES BRANCHES + HODS) ────
  const downloadHodTemplate = () => {
    const tpl = [
      ['hodName', 'hodId', 'gender', 'email', 'password', 'phoneNumber', 'assignedBranch', 'assignedBlock', 'status'],
      ['Dr. Alan Turing', 'HOD-CS-01', 'Male', 'turing@college.edu', 'SecurePass123', '9876543210', 'CSE', 'Block-1', 'Active'],
      ['Dr. Grace Hopper', 'HOD-EC-01', 'Female', 'hopper@college.edu', 'SecurePass456', '9876543211', 'ECE', 'Block-2', 'Active']
    ];
    const ws = XLSX.utils.aoa_to_sheet(tpl);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'HODs');
    XLSX.writeFile(wb, 'hod_branch_template.csv');
  };

  const handleHodFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const wb = XLSX.read(evt.target?.result, { type: 'binary' });
      const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]) as any[];
      // Require at minimum: hodName, hodId, email, assignedBranch
      const valid = data.filter(r => r.hodName && r.hodId && r.email && r.assignedBranch);
      if (valid.length === 0) {
        toast({ title: 'Invalid File', description: 'No valid rows found. Ensure hodName, hodId, email, assignedBranch columns exist.', variant: 'destructive' });
        return;
      }
      setHodUploadPreview(valid);
    };
    reader.readAsBinaryString(file);
  };

  const handleHodBulkUpload = async () => {
    if (!institutionId || hodUploadPreview.length === 0) return;
    setHodUploading(true);

    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        toast({ title: 'Auth Error', description: 'You must be logged in.', variant: 'destructive' });
        return;
      }

      const blockNames = blocks.map(b => String(b.blockNumber));
      const existingBranches = new Set(branches.map(b => b.branchName));
      const existingHodBranches = new Set(hods.map(h => h.branch));

      let branchesCreated = 0;
      let hodsCreated = 0;
      let hodsUpdated = 0;
      const errors: string[] = [];

      for (const row of hodUploadPreview) {
        const branchName = String(row.assignedBranch).trim();
        const assignedBlock = String(row.assignedBlock || row.assignedBlock || '').trim();
        const hodEmail = String(row.email).trim();

        // Validate email format
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(hodEmail)) {
          errors.push(`Invalid email: ${hodEmail}`);
          continue;
        }

        // Validate block exists if assignedBlock provided
        const blockForBranch = row.assignedBlock ? String(row.assignedBlock).trim() : '';
        if (blockForBranch && !blockNames.includes(blockForBranch)) {
          errors.push(`Block "${blockForBranch}" not found for branch "${branchName}"`);
          continue;
        }

        // 1. AUTO-CREATE BRANCH if it doesn't exist
        if (!existingBranches.has(branchName)) {
          await addDoc(collection(db, 'branches'), {
            institutionId,
            branchName,
            assignedBlock: blockForBranch,
            createdAt: serverTimestamp()
          });
          existingBranches.add(branchName);
          branchesCreated++;
        }

        // 2. CREATE OR UPDATE HOD
        const hodData: any = {
          institutionId,
          hodId: String(row.hodId).trim(),
          name: String(row.hodName).trim(),
          gender: String(row.gender || '').trim(),
          email: hodEmail,
          phoneNumber: String(row.phoneNumber || '').trim(),
          branch: branchName,
          assignedBlock: blockForBranch,
          status: String(row.status || 'Active').trim(),
        };

        // Store password for HOD auth (will be used when creating their user doc)
        const hodPassword = String(row.password || '').trim();

        if (existingHodBranches.has(branchName)) {
          // Update existing HOD for this branch
          const existingHodSnap = await getDocs(query(
            collection(db, 'hods'),
            where('institutionId', '==', institutionId),
            where('branch', '==', branchName)
          ));
          if (!existingHodSnap.empty) {
            await updateDoc(doc(db, 'hods', existingHodSnap.docs[0].id), hodData);
            hodsUpdated++;
          }
        } else {
          hodData.createdAt = serverTimestamp();
          await addDoc(collection(db, 'hods'), hodData);
          existingHodBranches.add(branchName);
          hodsCreated++;
        }

        // 3. Create/update user doc for HOD login (email+password in 'users' collection)
        // Check if user doc exists for this email
        const userSnap = await getDocs(query(
          collection(db, 'users'),
          where('email', '==', hodEmail),
          where('institutionId', '==', institutionId)
        ));

        if (userSnap.empty && hodPassword) {
          await addDoc(collection(db, 'users'), {
            email: hodEmail,
            password: hodPassword, // In production, hash this or use Firebase Auth
            role: 'HOD',
            institutionId,
            institutionName: college?.name || '',
            name: String(row.hodName).trim(),
            branch: branchName,
            assignedBlock: blockForBranch,
            createdAt: serverTimestamp()
          });
        }
      }

      // Show results
      const msgs: string[] = [];
      if (branchesCreated > 0) msgs.push(`${branchesCreated} branch(es) created`);
      if (hodsCreated > 0) msgs.push(`${hodsCreated} HOD(s) added`);
      if (hodsUpdated > 0) msgs.push(`${hodsUpdated} HOD(s) updated`);

      if (msgs.length > 0) {
        toast({ title: 'Upload Successful', description: msgs.join(', ') + '.' });
      }
      if (errors.length > 0) {
        toast({ title: 'Some Rows Skipped', description: errors.slice(0, 3).join('; '), variant: 'destructive' });
      }
      if (msgs.length === 0 && errors.length === 0) {
        toast({ title: 'Nothing Changed', description: 'All entries already exist.' });
      }

      setShowUploadDialog(false);
      setHodUploadPreview([]);
      await fetchAll();
    } catch (err: any) {
      console.error(err);
      toast({ title: 'Upload Failed', description: err?.message || 'Permission denied.', variant: 'destructive' });
    } finally {
      setHodUploading(false);
    }
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
              Upload HOD data to auto-generate branches and assignments.
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setShowUploadDialog(true)}>
              <Upload className="w-4 h-4 mr-2" /> Upload HOD Data
            </Button>
          </div>
        </div>

        {/* Main Content */}
        {loading ? (
          <div className="h-64 flex items-center justify-center border rounded-xl">
            <Activity className="animate-spin text-primary w-8 h-8" />
          </div>
        ) : selectedBranch ? (
          <BranchDetailView
            branch={selectedBranch}
            hod={getHODForBranch(selectedBranch.branchName)}
            stats={branchStats}
            onBack={() => setSelectedBranch(null)}
            onDeleteBranch={() => setDeleteTarget({ type: 'branch', id: selectedBranch.id })}
            onDeleteHOD={(id) => setDeleteTarget({ type: 'hod', id })}
          />
        ) : branches.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center border rounded-xl text-muted-foreground bg-muted/20">
            <Network className="w-12 h-12 mb-4 opacity-50" />
            <p>No branches yet. Upload HOD data to auto-create branches.</p>
          </div>
        ) : (
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

        {/* ──── HOD UPLOAD DIALOG ──── */}
        <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>Upload HOD & Branch Data</DialogTitle></DialogHeader>
            <p className="text-sm text-muted-foreground">
              Upload an Excel/CSV file with HOD details. Branches will be auto-created from the <strong>assignedBranch</strong> column.
            </p>
            <div className="space-y-4 mt-4">
              <div className="p-6 border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-center bg-muted/20">
                <Upload className="w-8 h-8 text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-1">Upload HOD Data File</h3>
                <p className="text-sm text-muted-foreground mb-4">Supports .csv or .xlsx files</p>
                <Input type="file" accept=".csv,.xlsx" className="max-w-xs cursor-pointer" onChange={handleHodFileUpload} />
              </div>
              <div className="flex justify-between items-center bg-blue-50/50 p-4 rounded-lg border border-blue-100">
                <div className="text-sm text-blue-800">
                  <p className="font-semibold">Need a template?</p>
                  <p>Download sample file with required headers.</p>
                </div>
                <Button variant="outline" size="sm" onClick={downloadHodTemplate} className="bg-white">
                  <Download className="w-4 h-4 mr-2" /> Template
                </Button>
              </div>

              {hodUploadPreview.length > 0 && (
                <div className="border rounded-xl overflow-x-auto max-h-48 overflow-y-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-muted-foreground bg-muted/50 sticky top-0">
                      <tr>
                        <th className="px-4 py-2">HOD Name</th>
                        <th className="px-4 py-2">HOD ID</th>
                        <th className="px-4 py-2">Email</th>
                        <th className="px-4 py-2">Branch</th>
                        <th className="px-4 py-2">Block</th>
                        <th className="px-4 py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {hodUploadPreview.map((r, i) => (
                        <tr key={i} className="border-b">
                          <td className="px-4 py-2">{r.hodName}</td>
                          <td className="px-4 py-2">{r.hodId}</td>
                          <td className="px-4 py-2">{r.email}</td>
                          <td className="px-4 py-2">{r.assignedBranch}</td>
                          <td className="px-4 py-2">{r.assignedBlock || '-'}</td>
                          <td className="px-4 py-2">{r.status || 'Active'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setShowUploadDialog(false); setHodUploadPreview([]); }}>Cancel</Button>
              <Button onClick={handleHodBulkUpload} disabled={hodUploadPreview.length === 0 || hodUploading}>
                {hodUploading ? 'Processing...' : `Upload ${hodUploadPreview.length} HOD(s)`}
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
}

function BranchDetailView({ branch, hod, stats, onBack, onDeleteBranch, onDeleteHOD }: BranchDetailProps) {
  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={onBack}><ArrowLeft className="w-5 h-5" /></Button>
        <h2 className="text-2xl font-bold text-foreground">{branch.branchName}</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="shadow-sm border-l-4" style={{ borderLeftColor: '#10B981' }}>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">Assigned Block</p>
            <p className="text-xl font-bold">{branch.assignedBlock || 'Not Mapped'}</p>
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
                <p className="font-semibold">{hod.phoneNumber || 'N/A'}</p>
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
