import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { StudentLayout } from '@/components/layout/StudentLayout';
import { ClipboardCheck, Activity } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

export default function StudentAttendancePage() {
    const { user } = useAuth();
    const [records, setRecords] = useState<any[]>([]);
    const [exams, setExams] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetch = async () => {
            if (!user?.id) { setLoading(false); return; }
            const institutionId = (user as any)?.collegeId || (user as any)?.institutionId;
            try {
                const [aSnap, eSnap] = await Promise.all([
                    getDocs(query(collection(db, 'attendance'), where('studentId', '==', user.id))),
                    getDocs(query(collection(db, 'exams'), where('institutionId', '==', institutionId)))
                ]);
                setRecords(aSnap.docs.map(d => ({ id: d.id, ...d.data() })));
                setExams(eSnap.docs.map(d => ({ id: d.id, ...d.data() })));
            } catch (err) { console.error(err); }
            setLoading(false);
        };
        fetch();
    }, [user]);

    return (
        <StudentLayout>
            <div className="max-w-7xl mx-auto space-y-8 animate-fade-in pb-12">
                <div>
                    <div className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
                        <span>Student</span><span>/</span><span>Attendance</span><span>/</span><span className="text-foreground font-medium">Status</span>
                    </div>
                    <h1 className="text-3xl font-display font-bold text-foreground mb-2">Attendance Status</h1>
                    <p className="text-muted-foreground">View your exam attendance records.</p>
                </div>

                {loading ? (
                    <div className="h-64 flex items-center justify-center border rounded-xl"><Activity className="animate-spin text-primary w-8 h-8" /></div>
                ) : records.length === 0 ? (
                    <div className="h-64 flex flex-col items-center justify-center border rounded-xl text-muted-foreground bg-muted/20">
                        <ClipboardCheck className="w-12 h-12 mb-4 opacity-50" />
                        <p>No attendance records found.</p>
                    </div>
                ) : (
                    <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-muted/50 text-muted-foreground font-semibold border-b">
                                <tr>
                                    <th className="px-6 py-4">Exam</th>
                                    <th className="px-6 py-4">Date</th>
                                    <th className="px-6 py-4">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {records.map(r => {
                                    const exam = exams.find(e => e.id === r.examId);
                                    return (
                                        <tr key={r.id} className="hover:bg-muted/20">
                                            <td className="px-6 py-4 font-medium">{exam?.name || r.examId?.slice(0, 10)}</td>
                                            <td className="px-6 py-4 text-muted-foreground">{exam?.date || 'N/A'}</td>
                                            <td className="px-6 py-4"><Badge variant={r.status === 'present' ? 'default' : 'destructive'} className="text-[10px] uppercase">{r.status}</Badge></td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </StudentLayout>
    );
}
