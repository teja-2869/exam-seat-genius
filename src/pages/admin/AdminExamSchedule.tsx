import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Calendar, Search, Filter, Activity, Eye, Edit2, Trash2, ArrowUpDown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, deleteDoc, doc, orderBy } from 'firebase/firestore';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';

export default function AdminExamSchedule() {
    const { user, college } = useAuth();
    const navigate = useNavigate();
    const [exams, setExams] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [filterDate, setFilterDate] = useState('');
    const [filterStatus, setFilterStatus] = useState('All');
    const [filterType, setFilterType] = useState('All');
    const [filterBranch, setFilterBranch] = useState('All');
    const [filterYear, setFilterYear] = useState('All');
    const [sortAsc, setSortAsc] = useState(true);

    const institutionId = college?.id || (user as any)?.institutionId;

    useEffect(() => {
        if (!institutionId) return;

        setLoading(true);
        const q = query(
            collection(db, 'exams'),
            where('institutionId', '==', institutionId),
            orderBy('date', sortAsc ? 'asc' : 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setExams(fetched);
            setLoading(false);
        }, (err) => {
            console.error(err);
            if (err.message.includes('requires an index')) {
                // Fallback client sort if composite index is missing
                console.warn('Missing composite index, initiating client fallback sorting');
                const rawQ = query(collection(db, 'exams'), where('institutionId', '==', institutionId));
                onSnapshot(rawQ, (rawSnap) => {
                    const rawFetched = rawSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    rawFetched.sort((a: any, b: any) => {
                        const d1 = new Date(a.date).getTime();
                        const d2 = new Date(b.date).getTime();
                        return sortAsc ? d1 - d2 : d2 - d1;
                    });
                    setExams(rawFetched);
                    setLoading(false);
                });
            } else {
                setError('Failed to securely load exams database.');
                setLoading(false);
            }
        });

        return () => unsubscribe();
    }, [institutionId, sortAsc]);

    // Derived filtering logic
    const filteredExams = exams.filter(exam => {
        let match = true;
        if (searchTerm && !exam.examName?.toLowerCase().includes(searchTerm.toLowerCase()) && !exam.subject?.toLowerCase().includes(searchTerm.toLowerCase())) match = false;
        if (filterDate && exam.date !== filterDate) match = false;
        if (filterStatus !== 'All' && exam.status !== filterStatus) match = false;
        if (filterType !== 'All' && exam.examType !== filterType) match = false;
        if (filterBranch !== 'All' && !(exam.branches || []).includes(filterBranch)) match = false;
        if (filterYear !== 'All' && !(exam.targetYears || []).includes(filterYear)) match = false;
        return match;
    });

    const uniqueBranches = Array.from(new Set(exams.flatMap(e => e.branches || []))).sort();

    const handleDelete = async (id: string) => {
        if (!window.confirm("Are you sure you want to completely delete this examination map?")) return;
        try {
            await deleteDoc(doc(db, 'exams', id));
        } catch (err) {
            console.error(err);
            alert("Failed to delete exam.");
        }
    };

    const getStatusVariant = (status: string) => {
        switch (status) {
            case 'GENERATED': return 'default';
            case 'CREATED': return 'secondary';
            case 'GENERATING': return 'outline';
            case 'PUBLISHED': return 'default';
            default: return 'outline';
        }
    };

    return (
        <AdminLayout>
            <div className="max-w-7xl mx-auto space-y-8 animate-fade-in pb-12">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <div className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
                            <span>Admin</span><span>/</span><span>Exams</span><span>/</span><span className="text-foreground font-medium">Exam Schedule</span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground mb-2">
                            Master Timetable
                        </h1>
                        <p className="text-muted-foreground">
                            Live synchronization of institutional exams, seating states, and overarching metadata.
                        </p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                        <Button onClick={() => navigate('/admin/exams/create')} className="w-full sm:w-auto">
                            + Create New Exam
                        </Button>
                    </div>
                </div>

                <Card className="dashboard-card border-none shadow-sm">
                    <CardContent className="p-4 flex flex-col gap-4 bg-muted/20 rounded-xl">
                        <div className="flex flex-col md:flex-row gap-4 items-center w-full">
                            <div className="relative w-full md:w-96 flex-shrink-0">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input 
                                    placeholder="Search by exam name or subject..." 
                                    className="pl-9 bg-white"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            
                            <div className="flex flex-wrap items-center gap-3 w-full">
                                <Input type="date" className="w-[160px] bg-white cursor-pointer" value={filterDate} onChange={e => setFilterDate(e.target.value)} />
                                
                                <Select value={filterType} onValueChange={setFilterType}>
                                    <SelectTrigger className="w-[120px] bg-white text-gray-700">
                                        <div className="flex items-center gap-2"><Filter className="w-4 h-4" /><SelectValue placeholder="Type" /></div>
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="All">All Types</SelectItem>
                                        <SelectItem value="Internal">Internal</SelectItem>
                                        <SelectItem value="External">External</SelectItem>
                                        <SelectItem value="Mid">MidTerm</SelectItem>
                                        <SelectItem value="Final">Final</SelectItem>
                                    </SelectContent>
                                </Select>

                                <Select value={filterBranch} onValueChange={setFilterBranch}>
                                    <SelectTrigger className="w-[120px] bg-white text-gray-700">
                                        <div className="flex items-center gap-2"><Filter className="w-4 h-4" /><SelectValue placeholder="Branch" /></div>
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="All">All Branches</SelectItem>
                                        {uniqueBranches.map((b: any) => (
                                            <SelectItem key={b} value={b}>{b}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                <Select value={filterYear} onValueChange={setFilterYear}>
                                    <SelectTrigger className="w-[120px] bg-white text-gray-700">
                                        <div className="flex items-center gap-2"><Filter className="w-4 h-4" /><SelectValue placeholder="Year" /></div>
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="All">All Years</SelectItem>
                                        <SelectItem value="1st Year">1st Year</SelectItem>
                                        <SelectItem value="2nd Year">2nd Year</SelectItem>
                                        <SelectItem value="3rd Year">3rd Year</SelectItem>
                                        <SelectItem value="4th Year">4th Year</SelectItem>
                                    </SelectContent>
                                </Select>

                                <Select value={filterStatus} onValueChange={setFilterStatus}>
                                    <SelectTrigger className="w-[120px] bg-white text-gray-700">
                                        <div className="flex items-center gap-2"><Filter className="w-4 h-4" /><SelectValue placeholder="Status" /></div>
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="All">All Statuses</SelectItem>
                                        <SelectItem value="CREATED">Created</SelectItem>
                                        <SelectItem value="GENERATING">Generating</SelectItem>
                                        <SelectItem value="GENERATED">Generated</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {error ? (
                    <div className="p-8 text-center border rounded-xl text-red-600 bg-red-50">{error}</div>
                ) : loading ? (
                    <div className="h-64 flex items-center justify-center border rounded-xl shadow-sm bg-white"><Activity className="animate-spin text-primary w-8 h-8" /></div>
                ) : filteredExams.length === 0 ? (
                    <div className="h-64 flex flex-col items-center justify-center border rounded-xl text-muted-foreground bg-white shadow-sm">
                        <Calendar className="w-12 h-12 mb-4 opacity-50 text-gray-400" />
                        <h3 className="text-lg font-semibold text-gray-700">No Exams Scheduled</h3>
                        <p className="text-sm mt-1">Adjust filters or create a new examination to begin tracing operations.</p>
                        <Button variant="outline" className="mt-6" onClick={() => navigate('/admin/exams/create')}>Initiate Exam Mapping</Button>
                    </div>
                ) : (
                    <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50/80 border-b text-xs uppercase text-gray-500 font-semibold tracking-wider">
                                    <tr>
                                        <th className="px-6 py-4">Detailed Exam Name</th>
                                        <th className="px-6 py-4 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => setSortAsc(!sortAsc)}>
                                            <div className="flex items-center gap-1">Date & Time <ArrowUpDown className="w-3 h-3" /></div>
                                        </th>
                                        <th className="px-6 py-4">Cohort Mapping</th>
                                        <th className="px-6 py-4">Total Capacity</th>
                                        <th className="px-6 py-4">Operational Status</th>
                                        <th className="px-6 py-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredExams.map((exam) => (
                                        <tr key={exam.id} className="hover:bg-blue-50/30 transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="font-semibold text-gray-900">{exam.examName}</div>
                                                <div className="text-xs text-muted-foreground mt-0.5">{exam.subject}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-gray-900 whitespace-nowrap">{exam.date}</div>
                                                <div className="text-xs text-muted-foreground mt-0.5">{exam.startTime} - {exam.endTime}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-wrap gap-1 max-w-[200px]">
                                                    {exam.targetYears?.map((y: string) => <Badge variant="secondary" key={y} className="text-[10px] px-1.5 py-0 bg-blue-50 text-blue-700">{y}</Badge>)}
                                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">{exam.examType}</Badge>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 font-mono text-gray-600">
                                                {exam.totalStudents || 0} Students
                                            </td>
                                            <td className="px-6 py-4">
                                                <Badge variant={getStatusVariant(exam.status)} className="capitalize">{exam.status || 'PENDING'}</Badge>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Button variant="ghost" size="icon" onClick={() => navigate(`/admin/exams/${exam.id}`)} className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50" title="View Details">
                                                        <Eye className="w-4 h-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" onClick={() => navigate(`/admin/exams/edit/${exam.id}`)} className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50" title="Edit Exam">
                                                        <Edit2 className="w-4 h-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" onClick={() => handleDelete(exam.id)} className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50" title="Delete Master Data">
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
            </div>
        </AdminLayout>
    );
}
