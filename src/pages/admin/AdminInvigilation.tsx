import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { UserCheck, Plus, Activity, Trash2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { toast } from 'sonner';

export default function AdminInvigilation() {
    const { college, user } = useAuth();
    const [duties, setDuties] = useState<any[]>([]);
    const [exams, setExams] = useState<any[]>([]);
    const [faculty, setFaculty] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showDialog, setShowDialog] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    const [form, setForm] = useState({ examId: '', facultyId: '', classroomId: '' });

    const getInstitutionId = () => college?.id || (user as any)?.institutionId;

    const fetchAll = async () => {
        const institutionId = getInstitutionId();
        if (!institutionId) { setLoading(false); return; }
        try {
            const [dSnap, eSnap, fSnap] = await Promise.all([
                getDocs(query(collection(db, 'invigilation'), where('institutionId', '==', institutionId))),
                getDocs(query(collection(db, 'exams'), where('institutionId', '==', institutionId))),
                getDocs(query(collection(db, 'users'), where('institutionId', '==', institutionId), where('role', '==', 'faculty')))
            ]);
            setDuties(dSnap.docs.map(d => ({ id: d.id, ...d.data() })));
            setExams(eSnap.docs.map(d => ({ id: d.id, ...d.data() })));
            setFaculty(fSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (err) {
            console.error(err);
            toast.error('Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchAll(); }, [college, user]);

    const handleAssign = async () => {
        const institutionId = getInstitutionId();
        if (!institutionId || !form.examId || !form.facultyId) {
            toast.error('Select exam and faculty');
            return;
        }
        try {
            await addDoc(collection(db, 'invigilation'), {
                institutionId,
                examId: form.examId,
                facultyId: form.facultyId,
                classroomId: form.classroomId,
                status: 'assigned',
                assignedBy: user?.id || '',
                createdAt: serverTimestamp()
            });
            toast.success('Duty assigned');
            setShowDialog(false);
            fetchAll();
        } catch (err) {
            console.error(err);
            toast.error('Failed to assign duty');
        }
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        try {
            await deleteDoc(doc(db, 'invigilation', deleteId));
            setDeleteId(null);
            toast.success('Duty removed');
            fetchAll();
        } catch (err) {
            console.error(err);
            toast.error('Failed to remove');
        }
    };

    const getExamName = (id: string) => exams.find(e => e.id === id)?.name || id.slice(0, 8);
    const getFacultyName = (id: string) => faculty.find(f => f.id === id)?.name || id.slice(0, 8);

    return (
        <AdminLayout>
            <div className="max-w-7xl mx-auto space-y-8 animate-fade-in pb-12">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
                            <span>Admin</span><span>/</span><span>Operations</span><span>/</span><span className="text-foreground font-medium">Invigilation</span>
                        </div>
                        <h1 className="text-3xl font-display font-bold text-foreground mb-2">Invigilation Duty Management</h1>
                        <p className="text-muted-foreground">Assign and manage invigilation duties across exams.</p>
                    </div>
                    <Button onClick={() => setShowDialog(true)}><Plus className="w-4 h-4 mr-2" /> Assign Duty</Button>
                </div>

                {loading ? (
                    <div className="h-64 flex items-center justify-center border rounded-xl"><Activity className="animate-spin text-primary w-8 h-8" /></div>
                ) : duties.length === 0 ? (
                    <div className="h-64 flex flex-col items-center justify-center border rounded-xl text-muted-foreground bg-muted/20">
                        <UserCheck className="w-12 h-12 mb-4 opacity-50" />
                        <p>No invigilation duties assigned yet.</p>
                    </div>
                ) : (
                    <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-muted/50 text-muted-foreground font-semibold border-b">
                                <tr>
                                    <th className="px-6 py-4">Exam</th>
                                    <th className="px-6 py-4">Faculty</th>
                                    <th className="px-6 py-4">Classroom</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {duties.map(d => (
                                    <tr key={d.id} className="hover:bg-muted/20">
                                        <td className="px-6 py-4 font-medium">{getExamName(d.examId)}</td>
                                        <td className="px-6 py-4">{getFacultyName(d.facultyId)}</td>
                                        <td className="px-6 py-4 text-muted-foreground">{d.classroomId || 'TBD'}</td>
                                        <td className="px-6 py-4"><Badge variant="outline" className="uppercase text-[10px]">{d.status}</Badge></td>
                                        <td className="px-6 py-4 text-right">
                                            <Button variant="ghost" size="icon" className="text-destructive h-8 w-8" onClick={() => setDeleteId(d.id)}><Trash2 className="w-4 h-4" /></Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                <Dialog open={showDialog} onOpenChange={setShowDialog}>
                    <DialogContent>
                        <DialogHeader><DialogTitle>Assign Invigilation Duty</DialogTitle></DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Exam</Label>
                                <Select value={form.examId} onValueChange={v => setForm({ ...form, examId: v })}>
                                    <SelectTrigger><SelectValue placeholder="Select exam" /></SelectTrigger>
                                    <SelectContent>
                                        {exams.map(e => <SelectItem key={e.id} value={e.id}>{e.name} - {e.subjectCode}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Faculty</Label>
                                <Select value={form.facultyId} onValueChange={v => setForm({ ...form, facultyId: v })}>
                                    <SelectTrigger><SelectValue placeholder="Select faculty" /></SelectTrigger>
                                    <SelectContent>
                                        {faculty.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Classroom (optional)</Label>
                                <Input placeholder="e.g., Room 101" value={form.classroomId} onChange={e => setForm({ ...form, classroomId: e.target.value })} />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
                            <Button onClick={handleAssign}>Assign Duty</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
                    <DialogContent>
                        <DialogHeader><DialogTitle>Remove Duty</DialogTitle></DialogHeader>
                        <div className="py-4">
                            <div className="flex gap-4 p-4 bg-destructive/10 text-destructive rounded-lg items-start">
                                <AlertCircle className="w-5 h-5 shrink-0" />
                                <p className="text-sm">Remove this invigilation assignment?</p>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
                            <Button variant="destructive" onClick={handleDelete}>Remove</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </AdminLayout>
    );
}
