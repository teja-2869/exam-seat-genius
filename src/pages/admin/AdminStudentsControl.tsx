import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Users, Filter, CheckCircle, XCircle, Search, Activity, ShieldAlert, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, updateDoc, doc, limit } from 'firebase/firestore';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

export default function AdminStudentsControl() {
    const { college, user } = useAuth();
    const [students, setStudents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterBranch, setFilterBranch] = useState('All');
    const [filterStatus, setFilterStatus] = useState('All');
    const [filterYear, setFilterYear] = useState('All');
    const [filterExamType, setFilterExamType] = useState('All');
    const [filterSection, setFilterSection] = useState('All');
    const [branches, setBranches] = useState<string[]>([]);
    const [datasetLocked, setDatasetLocked] = useState(false);
    const [showLockPrompt, setShowLockPrompt] = useState(false);

    // Edit Modal
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [selectedEditStudent, setSelectedEditStudent] = useState<any | null>(null);
    const [editFormData, setEditFormData] = useState({ name: '', rollNumber: '', section: '', examType: '', gender: '' });
    const [isSaving, setIsSaving] = useState(false);

    const fetchFilters = async () => {
        let institutionId = college?.id || (user as any)?.institutionId;
        if (!institutionId) return;
        try {
            const bQuery = query(collection(db, 'branches'), where('institutionId', '==', institutionId));
            const bSnap = await getDocs(bQuery);
            setBranches(bSnap.docs.map(d => d.data().branchName));
        } catch (err) { console.error(err); }
    };

    const fetchStudents = async () => {
        let institutionId = college?.id || (user as any)?.institutionId;
        if (!institutionId) { setLoading(false); return; }
        setLoading(true);
        try {
            const constraints: any[] = [where('institutionId', '==', institutionId)];
            if (filterBranch !== 'All') constraints.push(where('branch', '==', filterBranch));
            if (filterYear !== 'All') constraints.push(where('year', '==', filterYear));
            if (filterExamType !== 'All') constraints.push(where('examType', '==', filterExamType));
            if (filterSection !== 'All') constraints.push(where('section', '==', filterSection));
            constraints.push(limit(300));
            const sQuery = query(collection(db, 'students'), ...constraints);
            const snap = await getDocs(sQuery);
            let fetched = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
            fetched.sort((a, b) => String(a.rollNumber).localeCompare(String(b.rollNumber), undefined, { numeric: true }));
            setStudents(fetched);
        } catch (err) { console.error(err); } finally { setLoading(false); }
    };

    useEffect(() => { fetchFilters(); }, [college, user]);
    useEffect(() => { fetchStudents(); }, [college, user, filterBranch, filterYear, filterExamType, filterSection, filterStatus]);

    const toggleStudentStatus = async (studentId: string, currentStatus: string) => {
        if (datasetLocked) return;
        try {
            let newStatus = currentStatus === 'Active' ? 'Detained' : 'Active';
            await updateDoc(doc(db, 'students', studentId), { academicStatus: newStatus });
            fetchStudents();
        } catch (err) { console.error(err); }
    };

    const filteredStudents = students.filter(s => {
        let statusMatch = filterStatus === 'All' || s.academicStatus === filterStatus || s.status === filterStatus;
        let searchMatch = s.name?.toLowerCase().includes(searchQuery.toLowerCase()) || s.rollNumber?.toLowerCase().includes(searchQuery.toLowerCase());
        return statusMatch && searchMatch;
    });

    const resetFilters = () => {
        setFilterBranch('All'); setFilterYear('All'); setFilterExamType('All');
        setFilterSection('All'); setFilterStatus('All'); setSearchQuery('');
    };

    const handleEditStudent = async () => {
        if (!selectedEditStudent) return;
        setIsSaving(true);
        try {
            await updateDoc(doc(db, 'students', selectedEditStudent.id), {
                name: editFormData.name, rollNumber: editFormData.rollNumber,
                section: editFormData.section, examType: editFormData.examType, gender: editFormData.gender
            });
            setShowEditDialog(false); setSelectedEditStudent(null); fetchStudents();
        } catch (err) { console.error(err); } finally { setIsSaving(false); }
    };

    const openEdit = (s: any) => {
        if (datasetLocked) return;
        setSelectedEditStudent(s);
        setEditFormData({ name: s.name || '', rollNumber: s.rollNumber || '', section: s.section || '', examType: s.examType || 'Regular', gender: s.gender || '' });
        setShowEditDialog(true);
    };

    return (
        <AdminLayout>
            <div className="max-w-7xl mx-auto space-y-8 animate-fade-in pb-12">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <div className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
                            <span>Admin</span><span>/</span><span>Academics</span><span>/</span><span className="text-foreground font-medium">Student Engine</span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground mb-2">
                            Master Student Dataset
                        </h1>
                        <p className="text-muted-foreground">
                            Govern global student visibility and secure lock states.
                        </p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                        {datasetLocked ? (
                            <Button variant="destructive" disabled className="w-full sm:w-auto"><Lock className="w-4 h-4 mr-2" /> Dataset Locked</Button>
                        ) : (
                            <Button variant="destructive" onClick={() => setShowLockPrompt(true)} className="w-full sm:w-auto"><ShieldAlert className="w-4 h-4 mr-2" /> Lock Seating Roster</Button>
                        )}
                    </div>
                </div>

                {/* Filters */}
                <Card className="dashboard-card border-none shadow-sm">
                    <CardContent className="p-4 flex flex-col gap-4 bg-muted/20">
                        <div className="flex flex-col md:flex-row gap-4 items-center w-full">
                            <div className="relative w-full md:w-96 flex-shrink-0">
                                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                <Input placeholder="Search Roll No or Name..." className="pl-9" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} disabled={datasetLocked} />
                            </div>
                            <Button variant="ghost" onClick={resetFilters} disabled={datasetLocked} className="w-full md:w-auto ml-auto text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                                <Filter className="w-4 h-4 mr-2" /> Reset Filters
                            </Button>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                            <Select value={filterBranch} onValueChange={setFilterBranch} disabled={datasetLocked}>
                                <SelectTrigger><SelectValue placeholder="Branch" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="All">All Branches</SelectItem>
                                    {branches.map((br, i) => <SelectItem key={i} value={br}>{br}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <Select value={filterYear} onValueChange={setFilterYear} disabled={datasetLocked}>
                                <SelectTrigger><SelectValue placeholder="Year" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="All">All Years</SelectItem>
                                    <SelectItem value="1st Year">1st Year</SelectItem>
                                    <SelectItem value="2nd Year">2nd Year</SelectItem>
                                    <SelectItem value="3rd Year">3rd Year</SelectItem>
                                    <SelectItem value="4th Year">4th Year</SelectItem>
                                </SelectContent>
                            </Select>
                            <Select value={filterExamType} onValueChange={setFilterExamType} disabled={datasetLocked}>
                                <SelectTrigger><SelectValue placeholder="Exam Type" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="All">Both Types</SelectItem>
                                    <SelectItem value="Regular">Regular</SelectItem>
                                    <SelectItem value="Supplementary">Supplementary</SelectItem>
                                </SelectContent>
                            </Select>
                            <div className="flex gap-2 items-center col-span-2 md:col-span-2">
                                <Select value={filterSection} onValueChange={setFilterSection} disabled={datasetLocked}>
                                    <SelectTrigger className="flex-1"><SelectValue placeholder="Section" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="All">All Secs</SelectItem>
                                        {['A','B','C','D','E','F'].map(sec => <SelectItem key={sec} value={sec}>Sec {sec}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                <Select value={filterStatus} onValueChange={setFilterStatus} disabled={datasetLocked}>
                                    <SelectTrigger className="flex-1"><SelectValue placeholder="Status" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="All">All Statuses</SelectItem>
                                        <SelectItem value="Active">Active / Eligible</SelectItem>
                                        <SelectItem value="Detained">Detained</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {loading ? (
                    <div className="h-64 flex items-center justify-center border rounded-xl"><Activity className="animate-spin text-primary w-8 h-8" /></div>
                ) : filteredStudents.length === 0 ? (
                    <div className="h-64 flex flex-col items-center justify-center border rounded-xl text-muted-foreground bg-muted/20">
                        <Users className="w-12 h-12 mb-4 opacity-50" />
                        <p>No student records match the active filters or roster is empty.</p>
                    </div>
                ) : (
                    <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-muted/50 text-muted-foreground font-semibold border-b">
                                    <tr>
                                        <th className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">Roll Number</th>
                                        <th className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">Student Name</th>
                                        <th className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">Branch & Yr</th>
                                        <th className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">Academic Status</th>
                                        <th className="px-3 sm:px-6 py-3 sm:py-4 text-right whitespace-nowrap">Overrides</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {filteredStudents.map((student) => (
                                        <tr key={student.id} className="hover:bg-muted/20 transition-colors">
                                            <td className="px-3 sm:px-6 py-3 sm:py-4 font-bold whitespace-nowrap">{student.rollNumber || student.id.slice(0, 6).toUpperCase()}</td>
                                            <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">{student.name || 'Unnamed Record'}</td>
                                            <td className="px-3 sm:px-6 py-3 sm:py-4 text-muted-foreground whitespace-nowrap">{student.branch || 'None'} - Yr {student.year || 1}</td>
                                            <td className="px-3 sm:px-6 py-3 sm:py-4">
                                                <Badge variant={student.academicStatus === 'Active' || !student.academicStatus ? 'default' : 'destructive'} className="uppercase text-[10px] tracking-wider font-bold">
                                                    {student.academicStatus || 'Active'}
                                                </Badge>
                                            </td>
                                            <td className="px-3 sm:px-6 py-3 sm:py-4 text-right whitespace-nowrap">
                                                <div className="flex justify-end gap-1">
                                                    <Button variant="ghost" size="sm" className="text-blue-600" disabled={datasetLocked} onClick={(e) => { e.stopPropagation(); openEdit(student); }}>Edit</Button>
                                                    <Button variant="ghost" size="sm" className={student.academicStatus === 'Detained' ? 'text-green-600' : 'text-red-500'} disabled={datasetLocked} onClick={() => toggleStudentStatus(student.id, student.academicStatus || 'Active')}>
                                                        {student.academicStatus === 'Detained' ? <><CheckCircle className="w-4 h-4 mr-1 hidden sm:block" />Re-induct</> : <><XCircle className="w-4 h-4 mr-1 hidden sm:block" />Detain</>}
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Lock Prompt */}
                <Dialog open={showLockPrompt} onOpenChange={setShowLockPrompt}>
                    <DialogContent>
                        <DialogHeader><DialogTitle>Dataset Seating Lock Protocol</DialogTitle></DialogHeader>
                        <div className="py-4 space-y-4">
                            <div className="flex gap-4 p-4 bg-orange-100 text-orange-800 rounded-lg items-start border border-orange-200">
                                <ShieldAlert className="w-5 h-5 shrink-0" />
                                <p className="text-sm">Warning: Engaging the Dataset Lock freezes all HOD student uploads, faculty availability edits, and detainment filters. Do you proceed?</p>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setShowLockPrompt(false)}>Abort Sequence</Button>
                            <Button onClick={() => { setDatasetLocked(true); setShowLockPrompt(false); }}>Engage Lock</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Edit Student Modal */}
                <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
                    <DialogContent className="max-w-md">
                        <DialogHeader><DialogTitle>Edit Student Record</DialogTitle></DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Full Name</Label>
                                <Input value={editFormData.name} onChange={e => setEditFormData({ ...editFormData, name: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label>Roll Number</Label>
                                <Input value={editFormData.rollNumber} disabled className="bg-muted text-muted-foreground" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Section</Label>
                                    <Input value={editFormData.section} onChange={e => setEditFormData({ ...editFormData, section: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Exam Type</Label>
                                    <Select value={editFormData.examType} onValueChange={v => setEditFormData({ ...editFormData, examType: v })}>
                                        <SelectTrigger><SelectValue placeholder="Exam Type" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Regular">Regular</SelectItem>
                                            <SelectItem value="Supplementary">Supplementary</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Gender</Label>
                                <Select value={editFormData.gender} onValueChange={v => setEditFormData({ ...editFormData, gender: v })}>
                                    <SelectTrigger><SelectValue placeholder="Gender" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Male">Male</SelectItem>
                                        <SelectItem value="Female">Female</SelectItem>
                                        <SelectItem value="Other">Other</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setShowEditDialog(false)} disabled={isSaving}>Cancel</Button>
                            <Button onClick={handleEditStudent} disabled={isSaving}>{isSaving ? 'Saving...' : 'Save Changes'}</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </AdminLayout>
    );
}
