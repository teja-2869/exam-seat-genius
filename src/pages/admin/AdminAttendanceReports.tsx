import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { FileCheck, Activity, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { toast } from 'sonner';

export default function AdminAttendanceReports() {
    const { college, user } = useAuth();
    const [records, setRecords] = useState<any[]>([]);
    const [exams, setExams] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterExam, setFilterExam] = useState('All');

    const getInstitutionId = () => college?.id || (user as any)?.institutionId;

    useEffect(() => {
        const fetchData = async () => {
            const institutionId = getInstitutionId();
            if (!institutionId) { setLoading(false); return; }
            try {
                const [aSnap, eSnap] = await Promise.all([
                    getDocs(query(collection(db, 'attendance'), where('institutionId', '==', institutionId))),
                    getDocs(query(collection(db, 'exams'), where('institutionId', '==', institutionId)))
                ]);
                setRecords(aSnap.docs.map(d => ({ id: d.id, ...d.data() })));
                setExams(eSnap.docs.map(d => ({ id: d.id, ...d.data() })));
            } catch (err) {
                console.error(err);
                toast.error('Failed to load attendance data');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [college, user]);

    const filtered = filterExam === 'All' ? records : records.filter(r => r.examId === filterExam);
    const presentCount = filtered.filter(r => r.status === 'present').length;
    const absentCount = filtered.filter(r => r.status === 'absent').length;

    return (
        <AdminLayout>
            <div className="max-w-7xl mx-auto space-y-8 animate-fade-in pb-12">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
                            <span>Admin</span><span>/</span><span>Operations</span><span>/</span><span className="text-foreground font-medium">Attendance</span>
                        </div>
                        <h1 className="text-3xl font-display font-bold text-foreground mb-2">Attendance Reports</h1>
                        <p className="text-muted-foreground">View exam-wise attendance reports submitted by faculty.</p>
                    </div>
                    <Select value={filterExam} onValueChange={setFilterExam}>
                        <SelectTrigger className="w-56"><SelectValue placeholder="Filter by exam" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="All">All Exams</SelectItem>
                            {exams.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="dashboard-card">
                        <CardContent className="pt-6 text-center">
                            <p className="text-4xl font-bold text-foreground">{filtered.length}</p>
                            <p className="text-sm text-muted-foreground mt-1">Total Records</p>
                        </CardContent>
                    </Card>
                    <Card className="dashboard-card">
                        <CardContent className="pt-6 text-center">
                            <p className="text-4xl font-bold text-green-600">{presentCount}</p>
                            <p className="text-sm text-muted-foreground mt-1">Present</p>
                        </CardContent>
                    </Card>
                    <Card className="dashboard-card">
                        <CardContent className="pt-6 text-center">
                            <p className="text-4xl font-bold text-red-600">{absentCount}</p>
                            <p className="text-sm text-muted-foreground mt-1">Absent</p>
                        </CardContent>
                    </Card>
                </div>

                {loading ? (
                    <div className="h-64 flex items-center justify-center border rounded-xl"><Activity className="animate-spin text-primary w-8 h-8" /></div>
                ) : filtered.length === 0 ? (
                    <div className="h-64 flex flex-col items-center justify-center border rounded-xl text-muted-foreground bg-muted/20">
                        <FileCheck className="w-12 h-12 mb-4 opacity-50" />
                        <p>No attendance records found.</p>
                    </div>
                ) : (
                    <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-muted/50 text-muted-foreground font-semibold border-b">
                                <tr>
                                    <th className="px-6 py-4">Student ID</th>
                                    <th className="px-6 py-4">Exam</th>
                                    <th className="px-6 py-4">Room</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4">Marked By</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {filtered.map(r => (
                                    <tr key={r.id} className="hover:bg-muted/20">
                                        <td className="px-6 py-4 font-medium">{r.studentId?.slice(0, 10) || 'N/A'}</td>
                                        <td className="px-6 py-4">{exams.find(e => e.id === r.examId)?.name || r.examId?.slice(0, 8)}</td>
                                        <td className="px-6 py-4 text-muted-foreground">{r.classroomId || 'N/A'}</td>
                                        <td className="px-6 py-4"><Badge variant={r.status === 'present' ? 'default' : 'destructive'} className="uppercase text-[10px]">{r.status}</Badge></td>
                                        <td className="px-6 py-4 text-muted-foreground">{r.markedBy?.slice(0, 8) || 'N/A'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}
