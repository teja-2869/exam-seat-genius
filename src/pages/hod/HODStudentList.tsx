import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { HODLayout } from '@/components/layout/HODLayout';
import { Trash2, Edit, Activity, Users, Filter, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, updateDoc, deleteDoc, doc } from 'firebase/firestore';

export default function HODStudentList() {
    const { user, college } = useAuth();
    const hodObj = user as any;
    const institutionId = college?.id || hodObj?.institutionId;
    const branch = hodObj?.branch || '';

    const [studentList, setStudentList] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [filterYear, setFilterYear] = useState('All');
    const [filterExamType, setFilterExamType] = useState('All');
    const [filterSection, setFilterSection] = useState('All');
    const [filterStatus, setFilterStatus] = useState('All');

    // Edit dialog
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [submitLoading, setSubmitLoading] = useState(false);
    const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        name: '', rollNumber: '', gender: '', section: '',
        examType: 'Regular', status: 'Active', year: '1st Year',
        batchStartYear: '', batchEndYear: ''
    });

    const fetchStudents = async () => {
        if (!institutionId || !branch) { setStudentList([]); return; }
        setLoading(true);
        try {
            const constraints: any[] = [
                where('institutionId', '==', institutionId),
                where('branch', '==', branch)
            ];
            if (filterYear !== 'All') constraints.push(where('year', '==', filterYear));
            if (filterExamType !== 'All') constraints.push(where('examType', '==', filterExamType));
            if (filterSection !== 'All') constraints.push(where('section', '==', filterSection));

            const q = query(collection(db, 'students'), ...constraints);
            const snap = await getDocs(q);
            const fetched = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
            fetched.sort((a, b) => String(a.rollNumber).localeCompare(String(b.rollNumber), undefined, { numeric: true }));
            setStudentList(fetched);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchStudents(); }, [user, college, filterYear, filterExamType, filterSection]);

    const filteredStudents = useMemo(() => {
        return studentList.filter(s => {
            const statusMatch = filterStatus === 'All' || s.status === filterStatus || s.academicStatus === filterStatus;
            const searchMatch = !searchQuery ||
                s.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                s.rollNumber?.toLowerCase().includes(searchQuery.toLowerCase());
            return statusMatch && searchMatch;
        });
    }, [studentList, filterStatus, searchQuery]);

    // Derive unique sections from data
    const availableSections = useMemo(() => {
        const secs = new Set(studentList.map(s => s.section).filter(Boolean));
        return Array.from(secs).sort();
    }, [studentList]);

    const resetFilters = () => {
        setFilterYear('All');
        setFilterExamType('All');
        setFilterSection('All');
        setFilterStatus('All');
        setSearchQuery('');
    };

    const handleDeleteStudent = async (id: string) => {
        if (!window.confirm('Are you sure you want to remove this student?')) return;
        try {
            await deleteDoc(doc(db, 'students', id));
            await fetchStudents();
        } catch (err) {
            console.error(err);
            alert('Failed to delete student.');
        }
    };

    const openEdit = (student: any) => {
        setFormData({
            name: student.name || '', rollNumber: student.rollNumber || '',
            gender: student.gender || '', section: student.section || '',
            examType: student.examType || 'Regular', status: student.status || 'Active',
            year: student.year || '1st Year',
            batchStartYear: student.batchStartYear || '', batchEndYear: student.batchEndYear || ''
        });
        setSelectedStudentId(student.id);
        setShowEditDialog(true);
    };

    const handleEditStudent = async () => {
        if (!selectedStudentId) return;
        setSubmitLoading(true);
        try {
            await updateDoc(doc(db, 'students', selectedStudentId), { ...formData });
            alert('Student details updated.');
            setShowEditDialog(false);
            setSelectedStudentId(null);
            await fetchStudents();
        } catch (err) {
            console.error(err);
            alert('Failed to update student.');
        } finally {
            setSubmitLoading(false);
        }
    };

    const getGenderColor = (gender: string) => {
        const lower = (gender || '').trim().toLowerCase();
        if (lower === 'female') return 'bg-[#10B981] text-white border-none';
        if (lower === 'male') return 'bg-[#F43F5E] text-white border-none';
        return 'bg-[#F59E0B] text-white border-none';
    };

    return (
        <HODLayout>
            <div className="max-w-7xl mx-auto space-y-8 animate-fade-in pb-12">
                <div>
                    <div className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
                        <span>HOD</span><span>/</span><span>Department</span><span>/</span><span className="text-foreground font-medium">Student Registry</span>
                    </div>
                    <h1 className="text-3xl font-display font-bold text-foreground mb-2">
                        Student Registry
                    </h1>
                    <p className="text-muted-foreground">
                        View and filter department students for <strong>{branch || 'Unknown Department'}</strong>.
                    </p>
                </div>

                {/* Filter Bar */}
                <Card className="dashboard-card border-none shadow-sm">
                    <CardContent className="p-4 flex flex-col gap-4 bg-muted/20">
                        <div className="flex flex-col md:flex-row gap-4 items-center w-full">
                            <div className="relative w-full md:w-96 flex-shrink-0">
                                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                <Input placeholder="Search Roll No or Name..." className="pl-9" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                            </div>
                            <Button variant="ghost" onClick={resetFilters} className="w-full md:w-auto ml-auto text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                                <Filter className="w-4 h-4 mr-2" /> Reset Filters
                            </Button>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <Select value={filterYear} onValueChange={setFilterYear}>
                                <SelectTrigger><SelectValue placeholder="Year" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="All">All Years</SelectItem>
                                    <SelectItem value="1st Year">1st Year</SelectItem>
                                    <SelectItem value="2nd Year">2nd Year</SelectItem>
                                    <SelectItem value="3rd Year">3rd Year</SelectItem>
                                    <SelectItem value="4th Year">4th Year</SelectItem>
                                </SelectContent>
                            </Select>
                            <Select value={filterExamType} onValueChange={setFilterExamType}>
                                <SelectTrigger><SelectValue placeholder="Exam Type" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="All">Both Types</SelectItem>
                                    <SelectItem value="Regular">Regular</SelectItem>
                                    <SelectItem value="Supplementary">Supplementary</SelectItem>
                                </SelectContent>
                            </Select>
                            <Select value={filterSection} onValueChange={setFilterSection}>
                                <SelectTrigger><SelectValue placeholder="Section" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="All">All Sections</SelectItem>
                                    {availableSections.map(sec => <SelectItem key={sec} value={sec}>Sec {sec}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <Select value={filterStatus} onValueChange={setFilterStatus}>
                                <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="All">All Statuses</SelectItem>
                                    <SelectItem value="Active">Active</SelectItem>
                                    <SelectItem value="Inactive">Inactive</SelectItem>
                                    <SelectItem value="Detained">Detained</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>

                {loading ? (
                    <div className="h-64 flex items-center justify-center border rounded-xl"><Activity className="animate-spin text-primary w-8 h-8" /></div>
                ) : filteredStudents.length === 0 ? (
                    <div className="h-64 flex flex-col items-center justify-center border rounded-xl text-muted-foreground bg-white shadow-sm">
                        <Users className="w-12 h-12 mb-4 opacity-50 text-gray-400" />
                        <h3 className="text-lg font-semibold text-gray-700">No Students Found</h3>
                        <p className="text-sm mt-1">No records match the active filters, or the roster is empty.</p>
                    </div>
                ) : (
                    <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50/80 border-b text-xs uppercase text-gray-500 font-semibold tracking-wider">
                                    <tr>
                                        <th className="px-6 py-4">Student Name</th>
                                        <th className="px-6 py-4">Roll Number</th>
                                        <th className="px-6 py-4">Year</th>
                                        <th className="px-6 py-4">Gender</th>
                                        <th className="px-6 py-4">Section</th>
                                        <th className="px-6 py-4">Exam Type</th>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredStudents.map((student) => (
                                        <tr key={student.id} className="hover:bg-blue-50/30 transition-colors">
                                            <td className="px-6 py-4 font-medium text-gray-900 flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold shrink-0">
                                                    {student.name?.charAt(0).toUpperCase()}
                                                </div>
                                                {student.name}
                                            </td>
                                            <td className="px-6 py-4 font-mono text-gray-500">{student.rollNumber}</td>
                                            <td className="px-6 py-4 text-gray-600">{student.year || 'N/A'}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${getGenderColor(student.gender)}`}>
                                                    {student.gender || 'N/A'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 font-semibold text-gray-700">{student.section}</td>
                                            <td className="px-6 py-4 text-gray-600">{student.examType || 'Regular'}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded-md text-xs font-medium ${student.status === 'Active' ? 'text-green-700 bg-green-100' : 'text-gray-600 bg-gray-100'}`}>
                                                    {student.status || 'Active'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button variant="ghost" size="icon" onClick={() => openEdit(student)} className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                                                        <Edit className="w-4 h-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" onClick={() => handleDeleteStudent(student.id)} className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50">
                                                        <Trash2 className="w-4 h-4" />
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

                {/* EDIT STUDENT DIALOG */}
                <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
                    <DialogContent className="max-w-md">
                        <DialogHeader><DialogTitle>Edit Student Details</DialogTitle></DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Full Name</Label>
                                <Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label>Roll Number</Label>
                                <Input disabled value={formData.rollNumber} className="bg-muted text-muted-foreground" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Gender</Label>
                                    <Select value={formData.gender} onValueChange={(val) => setFormData({ ...formData, gender: val })}>
                                        <SelectTrigger><SelectValue placeholder="Gender" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Male">Male</SelectItem>
                                            <SelectItem value="Female">Female</SelectItem>
                                            <SelectItem value="Other">Other</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Section</Label>
                                    <Input value={formData.section} onChange={e => setFormData({ ...formData, section: e.target.value })} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Exam Type</Label>
                                    <Select value={formData.examType} onValueChange={(val) => setFormData({ ...formData, examType: val })}>
                                        <SelectTrigger><SelectValue placeholder="Exam Type" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Regular">Regular</SelectItem>
                                            <SelectItem value="Supplementary">Supplementary</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Status</Label>
                                    <Select value={formData.status} onValueChange={(val) => setFormData({ ...formData, status: val })}>
                                        <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Active">Active</SelectItem>
                                            <SelectItem value="Inactive">Inactive</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setShowEditDialog(false)} disabled={submitLoading}>Cancel</Button>
                            <Button onClick={handleEditStudent} disabled={submitLoading}>
                                {submitLoading ? 'Updating...' : 'Save Changes'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </HODLayout>
    );
}
