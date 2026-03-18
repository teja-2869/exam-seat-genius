import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { GraduationCap, Plus, Trash2, Activity, UserCog, AlertCircle, Phone, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, setDoc, doc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';

export default function AdminFacultyControl() {
    const { college, user } = useAuth();
    const [facultyList, setFacultyList] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showDialog, setShowDialog] = useState(false);
    const [showConfirmDelete, setShowConfirmDelete] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        name: '',
        facultyId: '',
        branch: '',
        phone: '',
        email: '',
        password: '',
        gender: 'Other',
        availabilityStatus: 'Available',
        examEligibility: true
    });

    const fetchFaculty = async () => {
        let institutionId = college?.id || (user as any)?.institutionId;
        if (!institutionId) { setLoading(false); return; }
        try {
            // Query faculty specifically bound to this institution
            const fQuery = query(collection(db, 'users'), where('institutionId', '==', institutionId), where('role', '==', 'faculty'));
            const snap = await getDocs(fQuery);

            const facultyData = snap.docs.map(doc => {
                const data = doc.data();
                return { id: doc.id, ...data };
            });
            setFacultyList(facultyData);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFaculty();
    }, [college, user]);

    const handleCreateFaculty = async () => {
        let institutionId = college?.id || (user as any)?.institutionId;
        if (!institutionId) return;

        try {
            const auth = getAuth();
            const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
            const newFacultyUid = userCredential.user.uid;

            // Create master user record mirroring schema
            await setDoc(doc(db, 'users', newFacultyUid), {
                email: formData.email,
                phone: formData.phone,
                role: 'faculty',
                institutionId,
                name: formData.name,
                branchId: formData.branch,
                gender: formData.gender,
                availabilityStatus: formData.availabilityStatus,
                examEligibility: formData.examEligibility,
                assignedDuties: [],
                createdAt: serverTimestamp()
            });

            setShowDialog(false);
            fetchFaculty();
        } catch (err: any) {
            console.error(err);
            alert(err.message || 'Failed to onboard Faculty member');
        }
    };

    const handleDelete = async () => {
        if (!showConfirmDelete) return;
        try {
            await deleteDoc(doc(db, 'users', showConfirmDelete));
            setShowConfirmDelete(null);
            fetchFaculty();
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <AdminLayout>
            <div className="max-w-7xl mx-auto space-y-8 animate-fade-in pb-12">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <div className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
                            <span>Admin</span><span>/</span><span>Personnel</span><span>/</span><span className="text-foreground font-medium">Faculty Matrix</span>
                        </div>
                        <h1 className="text-3xl font-display font-bold text-foreground mb-2">
                            Faculty Governance Engine
                        </h1>
                        <p className="text-muted-foreground">
                            Govern credentials, availability, and duty thresholds centrally.
                        </p>
                    </div>
                    <Button onClick={() => setShowDialog(true)}><Plus className="w-4 h-4 mr-2" /> Induct Faculty</Button>
                </div>

                {loading ? (
                    <div className="h-64 flex items-center justify-center border rounded-xl"><Activity className="animate-spin text-primary w-8 h-8" /></div>
                ) : facultyList.length === 0 ? (
                    <div className="h-64 flex flex-col items-center justify-center border rounded-xl text-muted-foreground bg-muted/20">
                        <GraduationCap className="w-12 h-12 mb-4 opacity-50" />
                        <p>No faculty members inducted under this institution.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {facultyList.map((fac) => (
                            <Card key={fac.id} className="dashboard-card relative overflow-hidden">
                                <CardHeader className="flex flex-row items-center justify-between border-b pb-4 bg-muted/20">
                                    <div className="flex flex-col">
                                        <CardTitle className="flex items-center gap-2 text-base"><GraduationCap className="w-4 h-4 text-primary" /> {fac.name}</CardTitle>
                                        <p className="text-xs text-muted-foreground mt-1">{fac.branchId}</p>
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-4 space-y-3">
                                    <div className="flex justify-between items-center bg-muted/50 p-2 rounded-md">
                                        <span className="text-xs font-semibold uppercase">Exam Eligibility</span>
                                        {fac.examEligibility === false ? <XCircle className="w-4 h-4 text-red-500" /> : <CheckCircle className="w-4 h-4 text-green-500" />}
                                    </div>
                                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                        <Phone className="w-4 h-4 shrink-0" />
                                        <span className="truncate">{fac.phone || 'No Phone Registered'}</span>
                                    </div>
                                    <div className="flex justify-between items-center pt-2">
                                        <span className="text-xs text-muted-foreground">Availability</span>
                                        <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded-md ${fac.availabilityStatus === 'Available' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>{fac.availabilityStatus || 'Available'}</span>
                                    </div>
                                </CardContent>
                                <CardFooter className="bg-muted/10 border-t py-2 flex justify-between items-center">
                                    <span className="text-xs text-muted-foreground font-medium">UID: {fac.id.slice(0, 6)}...</span>
                                    <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 h-7 w-7" onClick={() => setShowConfirmDelete(fac.id)}><Trash2 className="w-4 h-4" /></Button>
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                )}

                <Dialog open={showDialog} onOpenChange={setShowDialog}>
                    <DialogContent>
                        <DialogHeader><DialogTitle>Faculty Induction & Auth Creation</DialogTitle></DialogHeader>
                        <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto px-1">
                            <div className="space-y-2">
                                <Label>Faculty Full Name</Label>
                                <Input placeholder="e.g., Prof. Sarah Jenkins" onChange={e => setFormData({ ...formData, name: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label>Branch / Department</Label>
                                <Input placeholder="e.g., Computer Science" onChange={e => setFormData({ ...formData, branch: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label>Mobile Phone (Critical for OTP limits)</Label>
                                <Input placeholder="e.g., 9876543210" onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                            </div>
                            <div className="border-t pt-4 mt-4">
                                <p className="text-sm font-bold mb-4">Secure Login Credentials</p>
                            </div>
                            <div className="space-y-2">
                                <Label>Official Email</Label>
                                <Input type="email" placeholder="faculty@college.edu" onChange={e => setFormData({ ...formData, email: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label>Initial Password</Label>
                                <Input type="password" placeholder="System generated or manual" onChange={e => setFormData({ ...formData, password: e.target.value })} />
                            </div>

                            <div className="border-t pt-4 mt-4">
                                <p className="text-sm font-bold mb-4">Availability Matrix Settings</p>
                            </div>
                            <div className="flex items-center gap-4">
                                <Label>Active Invigilation Eligible?</Label>
                                <input type="checkbox" checked={formData.examEligibility} onChange={e => setFormData({ ...formData, examEligibility: e.target.checked })} />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
                            <Button onClick={handleCreateFaculty}>Induct & Authenticate</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                <Dialog open={!!showConfirmDelete} onOpenChange={() => setShowConfirmDelete(null)}>
                    <DialogContent>
                        <DialogHeader><DialogTitle>Confirm Personnel Dismissal</DialogTitle></DialogHeader>
                        <div className="py-4">
                            <div className="flex gap-4 p-4 bg-destructive/10 text-destructive rounded-lg items-start">
                                <AlertCircle className="w-5 h-5 shrink-0" />
                                <p className="text-sm">Are you absolutely sure you want to dismiss this structural faculty member? All historical active tracking linked to their UID might be impacted.</p>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setShowConfirmDelete(null)}>Abort</Button>
                            <Button variant="destructive" onClick={handleDelete}>Confirm Dismissal</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </AdminLayout>
    );
}
