import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { PlusCircle, Save, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export default function AdminCreateExam() {
    const { college, user } = useAuth();
    const navigate = useNavigate();
    const [saving, setSaving] = useState(false);
    const [branches, setBranches] = useState<any[]>([]);

    const [form, setForm] = useState({
        name: '',
        type: 'internal',
        subjectCode: '',
        subjectName: '',
        date: '',
        startTime: '',
        endTime: '',
        semester: 1,
        year: new Date().getFullYear(),
        branch: '',
        notes: '',
        status: 'draft'
    });

    const getInstitutionId = () => college?.id || (user as any)?.institutionId;

    useEffect(() => {
        const fetchBranches = async () => {
            const id = getInstitutionId();
            if (!id) return;
            try {
                const snap = await getDocs(query(collection(db, 'branches'), where('institutionId', '==', id)));
                setBranches(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            } catch (err) { console.error(err); }
        };
        fetchBranches();
    }, [college, user]);

    const handleCreate = async () => {
        const institutionId = getInstitutionId();
        if (!institutionId) return;
        if (!form.name.trim() || !form.subjectCode.trim() || !form.date) {
            toast.error('Please fill in exam name, subject code, and date');
            return;
        }

        setSaving(true);
        try {
            await addDoc(collection(db, 'exams'), {
                institutionId,
                name: form.name,
                type: form.type,
                subjectCode: form.subjectCode,
                subjectName: form.subjectName,
                date: form.date,
                startTime: form.startTime,
                endTime: form.endTime,
                semester: Number(form.semester),
                year: Number(form.year),
                branch: form.branch,
                notes: form.notes,
                status: form.status,
                createdBy: user?.id || '',
                createdAt: serverTimestamp()
            });
            toast.success('Exam created successfully');
            navigate('/admin/exams/schedule');
        } catch (err) {
            console.error(err);
            toast.error('Failed to create exam');
        } finally {
            setSaving(false);
        }
    };

    return (
        <AdminLayout>
            <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-12">
                <div>
                    <div className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
                        <span>Admin</span><span>/</span><span>Exams</span><span>/</span><span className="text-foreground font-medium">Create Exam</span>
                    </div>
                    <h1 className="text-3xl font-display font-bold text-foreground mb-2">Create New Exam</h1>
                    <p className="text-muted-foreground">Define exam details, subjects, dates, and assign to branches.</p>
                </div>

                <Card className="dashboard-card">
                    <CardHeader><CardTitle className="flex items-center gap-2"><PlusCircle className="w-5 h-5 text-primary" /> Exam Details</CardTitle></CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Exam Name *</Label>
                                <Input placeholder="e.g., Mid Semester 1 - 2025" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label>Type</Label>
                                <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="internal">Internal</SelectItem>
                                        <SelectItem value="external">External</SelectItem>
                                        <SelectItem value="supplementary">Supplementary</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Subject Code *</Label>
                                <Input placeholder="e.g., CS301" value={form.subjectCode} onChange={e => setForm({ ...form, subjectCode: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label>Subject Name</Label>
                                <Input placeholder="e.g., Data Structures" value={form.subjectName} onChange={e => setForm({ ...form, subjectName: e.target.value })} />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label>Date *</Label>
                                <Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label>Start Time</Label>
                                <Input type="time" value={form.startTime} onChange={e => setForm({ ...form, startTime: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label>End Time</Label>
                                <Input type="time" value={form.endTime} onChange={e => setForm({ ...form, endTime: e.target.value })} />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label>Semester</Label>
                                <Input type="number" min="1" max="8" value={form.semester} onChange={e => setForm({ ...form, semester: Number(e.target.value) })} />
                            </div>
                            <div className="space-y-2">
                                <Label>Year</Label>
                                <Input type="number" value={form.year} onChange={e => setForm({ ...form, year: Number(e.target.value) })} />
                            </div>
                            <div className="space-y-2">
                                <Label>Branch</Label>
                                <Select value={form.branch} onValueChange={v => setForm({ ...form, branch: v })}>
                                    <SelectTrigger><SelectValue placeholder="All branches" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Branches</SelectItem>
                                        {branches.map(b => (
                                            <SelectItem key={b.id} value={b.branchName}>{b.branchName}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Notes</Label>
                            <Textarea placeholder="Any additional instructions..." value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t">
                            <Button variant="outline" onClick={() => navigate('/admin/exams/schedule')}>Cancel</Button>
                            <Button onClick={handleCreate} disabled={saving}>
                                {saving ? <Activity className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                                Create Exam
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AdminLayout>
    );
}
