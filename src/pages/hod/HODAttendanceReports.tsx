import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { HODLayout } from '@/components/layout/HODLayout';
import { FileSpreadsheet, Activity } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { toast } from 'sonner';

export default function HODAttendanceReports() {
    const { college, user } = useAuth();
    const [records, setRecords] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetch = async () => {
            const institutionId = college?.id || (user as any)?.institutionId;
            if (!institutionId) { setLoading(false); return; }
            try {
                const snap = await getDocs(query(collection(db, 'attendance'), where('institutionId', '==', institutionId)));
                setRecords(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            } catch (err) { console.error(err); toast.error('Failed to load'); }
            setLoading(false);
        };
        fetch();
    }, [college, user]);

    const present = records.filter(r => r.status === 'present').length;
    const absent = records.filter(r => r.status === 'absent').length;

    return (
        <HODLayout>
            <div className="max-w-7xl mx-auto space-y-8 animate-fade-in pb-12">
                <div>
                    <div className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
                        <span>HOD</span><span>/</span><span>Reports</span><span>/</span><span className="text-foreground font-medium">Attendance</span>
                    </div>
                    <h1 className="text-3xl font-display font-bold text-foreground mb-2">Attendance Reports</h1>
                    <p className="text-muted-foreground">View exam attendance reports for your department.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="dashboard-card"><CardContent className="pt-6 text-center"><p className="text-4xl font-bold">{records.length}</p><p className="text-sm text-muted-foreground mt-1">Total Records</p></CardContent></Card>
                    <Card className="dashboard-card"><CardContent className="pt-6 text-center"><p className="text-4xl font-bold text-green-600">{present}</p><p className="text-sm text-muted-foreground mt-1">Present</p></CardContent></Card>
                    <Card className="dashboard-card"><CardContent className="pt-6 text-center"><p className="text-4xl font-bold text-red-600">{absent}</p><p className="text-sm text-muted-foreground mt-1">Absent</p></CardContent></Card>
                </div>

                {loading ? (
                    <div className="h-64 flex items-center justify-center border rounded-xl"><Activity className="animate-spin text-primary w-8 h-8" /></div>
                ) : records.length === 0 ? (
                    <div className="h-64 flex flex-col items-center justify-center border rounded-xl text-muted-foreground bg-muted/20">
                        <FileSpreadsheet className="w-12 h-12 mb-4 opacity-50" />
                        <p>No attendance records found.</p>
                    </div>
                ) : (
                    <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-muted/50 text-muted-foreground font-semibold border-b">
                                <tr>
                                    <th className="px-6 py-4">Student</th>
                                    <th className="px-6 py-4">Exam</th>
                                    <th className="px-6 py-4">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {records.map(r => (
                                    <tr key={r.id} className="hover:bg-muted/20">
                                        <td className="px-6 py-4 font-medium">{r.studentId?.slice(0, 10) || 'N/A'}</td>
                                        <td className="px-6 py-4">{r.examId?.slice(0, 10) || 'N/A'}</td>
                                        <td className="px-6 py-4"><Badge variant={r.status === 'present' ? 'default' : 'destructive'} className="text-[10px] uppercase">{r.status}</Badge></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </HODLayout>
    );
}
