import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Calendar, Trash2, AlertCircle, Activity, Edit, Eye, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, deleteDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export default function AdminExamSchedule() {
    const { college, user } = useAuth();
    const navigate = useNavigate();
    const [exams, setExams] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [filterType, setFilterType] = useState('All');

    const getInstitutionId = () => college?.id || (user as any)?.institutionId;

    const fetchExams = async () => {
        const institutionId = getInstitutionId();
        if (!institutionId) { setLoading(false); return; }
        try {
            const snap = await getDocs(query(collection(db, 'exams'), where('institutionId', '==', institutionId)));
            const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            data.sort((a: any, b: any) => (a.date > b.date ? -1 : 1));
            setExams(data);
        } catch (err) {
            console.error(err);
            toast.error('Failed to load exams');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchExams(); }, [college, user]);

    const handleDelete = async () => {
        if (!deleteId) return;
        try {
            await deleteDoc(doc(db, 'exams', deleteId));
            setDeleteId(null);
            toast.success('Exam deleted');
            fetchExams();
        } catch (err) {
            console.error(err);
            toast.error('Failed to delete exam');
        }
    };

    const toggleStatus = async (examId: string, currentStatus: string) => {
        const next = currentStatus === 'draft' ? 'published' : currentStatus === 'published' ? 'locked' : 'draft';
        try {
            await updateDoc(doc(db, 'exams', examId), { status: next, updatedAt: serverTimestamp() });
            toast.success(`Exam status changed to ${next}`);
            fetchExams();
        } catch (err) {
            console.error(err);
            toast.error('Failed to update status');
        }
    };

    const filtered = exams.filter(e => filterType === 'All' || e.type === filterType);

    const statusColor = (s: string) => {
        if (s === 'published') return 'default';
        if (s === 'locked') return 'destructive';
        return 'secondary';
    };

    return (
        <AdminLayout>
            <div className="max-w-7xl mx-auto space-y-8 animate-fade-in pb-12">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
                            <span>Admin</span><span>/</span><span>Exams</span><span>/</span><span className="text-foreground font-medium">Schedule</span>
                        </div>
                        <h1 className="text-3xl font-display font-bold text-foreground mb-2">Exam Schedule</h1>
                        <p className="text-muted-foreground">View and manage the complete examination timetable.</p>
                    </div>
                    <div className="flex gap-3">
                        <Select value={filterType} onValueChange={setFilterType}>
                            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="All">All Types</SelectItem>
                                <SelectItem value="internal">Internal</SelectItem>
                                <SelectItem value="external">External</SelectItem>
                                <SelectItem value="supplementary">Supplementary</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button onClick={() => navigate('/admin/exams/create')}><Plus className="w-4 h-4 mr-2" /> New Exam</Button>
                    </div>
                </div>

                {loading ? (
                    <div className="h-64 flex items-center justify-center border rounded-xl"><Activity className="animate-spin text-primary w-8 h-8" /></div>
                ) : filtered.length === 0 ? (
                    <div className="h-64 flex flex-col items-center justify-center border rounded-xl text-muted-foreground bg-muted/20">
                        <Calendar className="w-12 h-12 mb-4 opacity-50" />
                        <p>No exams scheduled yet.</p>
                    </div>
                ) : (
                    <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-muted/50 text-muted-foreground font-semibold border-b">
                                    <tr>
                                        <th className="px-6 py-4">Subject</th>
                                        <th className="px-6 py-4">Exam Name</th>
                                        <th className="px-6 py-4">Date</th>
                                        <th className="px-6 py-4">Time</th>
                                        <th className="px-6 py-4">Type</th>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {filtered.map((exam) => (
                                        <tr key={exam.id} className="hover:bg-muted/20 transition-colors">
                                            <td className="px-6 py-4 font-bold">{exam.subjectCode} - {exam.subjectName}</td>
                                            <td className="px-6 py-4">{exam.name}</td>
                                            <td className="px-6 py-4">{exam.date}</td>
                                            <td className="px-6 py-4 text-muted-foreground">{exam.startTime} - {exam.endTime}</td>
                                            <td className="px-6 py-4"><Badge variant="outline" className="uppercase text-[10px]">{exam.type}</Badge></td>
                                            <td className="px-6 py-4">
                                                <Badge variant={statusColor(exam.status)} className="uppercase text-[10px] cursor-pointer" onClick={() => toggleStatus(exam.id, exam.status)}>
                                                    {exam.status}
                                                </Badge>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <Button variant="ghost" size="icon" className="text-destructive h-8 w-8" onClick={() => setDeleteId(exam.id)}><Trash2 className="w-4 h-4" /></Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
                    <DialogContent>
                        <DialogHeader><DialogTitle>Delete Exam</DialogTitle></DialogHeader>
                        <div className="py-4">
                            <div className="flex gap-4 p-4 bg-destructive/10 text-destructive rounded-lg items-start">
                                <AlertCircle className="w-5 h-5 shrink-0" />
                                <p className="text-sm">This will permanently remove this exam and any associated seating plans.</p>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
                            <Button variant="destructive" onClick={handleDelete}>Delete Exam</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </AdminLayout>
    );
}
