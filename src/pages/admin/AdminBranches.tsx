import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Network, Plus, Trash2, Activity, UserCog, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword, getAuth } from 'firebase/auth';
import { toast } from 'sonner';

export default function AdminBranches() {
    const { college, user } = useAuth();
    const [branches, setBranches] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showDialog, setShowDialog] = useState(false);
    const [showConfirmDelete, setShowConfirmDelete] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        branchName: '',
        blockAssigned: '',
        hodName: '',
        hodIdDisplay: '',
        email: '',
        password: '',
        status: 'Active'
    });

    const fetchBranches = async () => {
        let institutionId = college?.id || (user as any)?.institutionId;
        if (!institutionId) { setLoading(false); return; }
        try {
            const bQuery = query(collection(db, 'branches'), where('institutionId', '==', institutionId));
            const snap = await getDocs(bQuery);
            setBranches(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBranches();
    }, [college, user]);

    const handleCreateBranchAndHOD = async () => {
        let institutionId = college?.id || (user as any)?.institutionId;
        if (!institutionId) return;

        try {
            const auth = getAuth();
            // Only runs securely if admin is authorized natively, or else triggered via Cloud Function normally.
            // For this SaaS UI mapping, we process direct auth if active session permits or simulate logging.
            const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);

            const newHodId = userCredential.user.uid;

            // Create User Record
            await setDoc(doc(db, 'users', newHodId), {
                email: formData.email,
                role: 'hod',
                institutionId,
                name: formData.hodName,
                branchId: formData.branchName, // Tie to branch
                createdAt: serverTimestamp()
            });

            // Create Branch Record
            await addDoc(collection(db, 'branches'), {
                institutionId,
                branchName: formData.branchName,
                blockAssigned: formData.blockAssigned,
                hodId: newHodId,
                hodDisplayId: formData.hodIdDisplay,
                status: formData.status,
                createdAt: serverTimestamp()
            });

            setShowDialog(false);
            fetchBranches();
        } catch (err: any) {
            console.error(err);
            alert(err.message || 'Failed to register HOD and Branch');
        }
    };

    const handleDelete = async () => {
        if (!showConfirmDelete) return;
        try {
            await deleteDoc(doc(db, 'branches', showConfirmDelete));
            setShowConfirmDelete(null);
            fetchBranches();
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <AdminLayout>
            <div className="max-w-7xl mx-auto space-y-8 animate-fade-in pb-12">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
                            <span>Admin</span><span>/</span><span>Departments</span><span>/</span><span className="text-foreground font-medium">Branch Management</span>
                        </div>
                        <h1 className="text-3xl font-display font-bold text-foreground mb-2">
                            Branch & HOD Control
                        </h1>
                        <p className="text-muted-foreground">
                            Manage department leadership, generate credentials, and track HOD activity.
                        </p>
                    </div>
                    <Button onClick={() => setShowDialog(true)}><Plus className="w-4 h-4 mr-2" /> Induct Department</Button>
                </div>

                {loading ? (
                    <div className="h-64 flex items-center justify-center border rounded-xl"><Activity className="animate-spin text-primary w-8 h-8" /></div>
                ) : branches.length === 0 ? (
                    <div className="h-64 flex flex-col items-center justify-center border rounded-xl text-muted-foreground bg-muted/20">
                        <Network className="w-12 h-12 mb-4 opacity-50" />
                        <p>No branches inducted yet.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {branches.map((branch) => (
                            <Card key={branch.id} className="dashboard-card relative">
                                <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
                                    <div>
                                        <CardTitle className="flex items-center gap-2"><Network className="w-5 h-5 text-primary" /> {branch.branchName}</CardTitle>
                                        <p className="text-sm text-muted-foreground mt-1">Block: {branch.blockAssigned}</p>
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                        <span className={`px-3 py-1 text-xs font-semibold rounded-full ${branch.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{branch.status}</span>
                                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive h-6 w-6" onClick={() => setShowConfirmDelete(branch.id)}><Trash2 className="w-4 h-4" /></Button>
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-4 space-y-4">
                                    <div className="flex items-start gap-3">
                                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center"><UserCog className="w-4 h-4 text-primary" /></div>
                                        <div>
                                            <p className="text-xs text-muted-foreground uppercase font-semibold">Head of Department</p>
                                            <p className="text-sm font-semibold">{branch.hodDisplayId || 'HOD ID Pending'}</p>
                                            <p className="text-xs mt-1 text-muted-foreground">UID: {branch.hodId?.slice(0, 8)}...</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}

                <Dialog open={showDialog} onOpenChange={setShowDialog}>
                    <DialogContent>
                        <DialogHeader><DialogTitle>Department Induction & Credentials</DialogTitle></DialogHeader>
                        <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto px-1">
                            <div className="space-y-2">
                                <Label>Branch Name</Label>
                                <Input placeholder="e.g., Computer Science" onChange={e => setFormData({ ...formData, branchName: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label>Block Assigned</Label>
                                <Input placeholder="e.g., Main Block" onChange={e => setFormData({ ...formData, blockAssigned: e.target.value })} />
                            </div>

                            <div className="border-t pt-4 mt-4">
                                <p className="text-sm font-bold mb-4">HOD Credentials Module</p>
                            </div>
                            <div className="space-y-2">
                                <Label>HOD Full Name</Label>
                                <Input placeholder="e.g., Dr. Alan Turing" onChange={e => setFormData({ ...formData, hodName: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label>HOD Official ID</Label>
                                <Input placeholder="e.g., HOD-CS-01" onChange={e => setFormData({ ...formData, hodIdDisplay: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label>Official Email</Label>
                                <Input type="email" placeholder="turing@college.edu" onChange={e => setFormData({ ...formData, email: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label>Secure Password</Label>
                                <Input type="password" placeholder="Auto-generate or manual" onChange={e => setFormData({ ...formData, password: e.target.value })} />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
                            <Button onClick={handleCreateBranchAndHOD}>Induct Branch</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                <Dialog open={!!showConfirmDelete} onOpenChange={() => setShowConfirmDelete(null)}>
                    <DialogContent>
                        <DialogHeader><DialogTitle>Confirm Department Erasure</DialogTitle></DialogHeader>
                        <div className="py-4">
                            <div className="flex gap-4 p-4 bg-destructive/10 text-destructive rounded-lg items-start">
                                <AlertCircle className="w-5 h-5 shrink-0" />
                                <p className="text-sm">Are you sure you want to completely erase this department? The HOD account associated will remain orphaned until manually handled.</p>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setShowConfirmDelete(null)}>Abort</Button>
                            <Button variant="destructive" onClick={handleDelete}>Confirm Deletion</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </AdminLayout>
    );
}
