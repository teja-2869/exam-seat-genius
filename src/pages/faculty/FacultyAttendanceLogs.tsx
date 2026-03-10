import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { FacultyLayout } from '@/components/layout/FacultyLayout';
import { FileCheck, Activity } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

export default function FacultyAttendanceLogs() {
    const { user } = useAuth();
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetch = async () => {
            if (!user?.id) { setLoading(false); return; }
            try {
                const snap = await getDocs(query(collection(db, 'attendance'), where('markedBy', '==', user.id)));
                setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            } catch (err) { console.error(err); }
            setLoading(false);
        };
        fetch();
    }, [user]);

    return (
        <FacultyLayout>
            <div className="max-w-7xl mx-auto space-y-8 animate-fade-in pb-12">
                <div>
                    <div className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
                        <span>Faculty</span><span>/</span><span>History</span><span>/</span><span className="text-foreground font-medium">Attendance Logs</span>
                    </div>
                    <h1 className="text-3xl font-display font-bold text-foreground mb-2">Attendance Logs</h1>
                    <p className="text-muted-foreground">Past attendance submissions you've made.</p>
                </div>

                {loading ? (
                    <div className="h-64 flex items-center justify-center border rounded-xl"><Activity className="animate-spin text-primary w-8 h-8" /></div>
                ) : logs.length === 0 ? (
                    <div className="h-64 flex flex-col items-center justify-center border rounded-xl text-muted-foreground bg-muted/20">
                        <FileCheck className="w-12 h-12 mb-4 opacity-50" />
                        <p>No attendance records submitted yet.</p>
                    </div>
                ) : (
                    <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-muted/50 text-muted-foreground font-semibold border-b">
                                <tr>
                                    <th className="px-6 py-4">Student</th>
                                    <th className="px-6 py-4">Exam</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4">Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {logs.map(l => (
                                    <tr key={l.id} className="hover:bg-muted/20">
                                        <td className="px-6 py-4 font-medium">{l.studentId?.slice(0, 10)}</td>
                                        <td className="px-6 py-4">{l.examId?.slice(0, 10)}</td>
                                        <td className="px-6 py-4"><Badge variant={l.status === 'present' ? 'default' : 'destructive'} className="text-[10px] uppercase">{l.status}</Badge></td>
                                        <td className="px-6 py-4 text-muted-foreground">{l.createdAt?.toDate?.()?.toLocaleDateString() || 'N/A'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </FacultyLayout>
    );
}
