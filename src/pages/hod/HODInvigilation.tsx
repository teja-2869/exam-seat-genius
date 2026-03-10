import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { HODLayout } from '@/components/layout/HODLayout';
import { ClipboardList, Activity } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { toast } from 'sonner';

export default function HODInvigilation() {
    const { college, user } = useAuth();
    const [duties, setDuties] = useState<any[]>([]);
    const [faculty, setFaculty] = useState<any[]>([]);
    const [exams, setExams] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetch = async () => {
            const institutionId = college?.id || (user as any)?.institutionId;
            if (!institutionId) { setLoading(false); return; }
            try {
                const [dSnap, fSnap, eSnap] = await Promise.all([
                    getDocs(query(collection(db, 'invigilation'), where('institutionId', '==', institutionId))),
                    getDocs(query(collection(db, 'users'), where('institutionId', '==', institutionId), where('role', '==', 'faculty'))),
                    getDocs(query(collection(db, 'exams'), where('institutionId', '==', institutionId)))
                ]);
                setDuties(dSnap.docs.map(d => ({ id: d.id, ...d.data() })));
                setFaculty(fSnap.docs.map(d => ({ id: d.id, ...d.data() })));
                setExams(eSnap.docs.map(d => ({ id: d.id, ...d.data() })));
            } catch (err) { console.error(err); toast.error('Failed to load'); }
            setLoading(false);
        };
        fetch();
    }, [college, user]);

    return (
        <HODLayout>
            <div className="max-w-7xl mx-auto space-y-8 animate-fade-in pb-12">
                <div>
                    <div className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
                        <span>HOD</span><span>/</span><span>Exams</span><span>/</span><span className="text-foreground font-medium">Invigilation</span>
                    </div>
                    <h1 className="text-3xl font-display font-bold text-foreground mb-2">Invigilation Overview</h1>
                    <p className="text-muted-foreground">View invigilation duty assignments for your department faculty.</p>
                </div>

                {loading ? (
                    <div className="h-64 flex items-center justify-center border rounded-xl"><Activity className="animate-spin text-primary w-8 h-8" /></div>
                ) : duties.length === 0 ? (
                    <div className="h-64 flex flex-col items-center justify-center border rounded-xl text-muted-foreground bg-muted/20">
                        <ClipboardList className="w-12 h-12 mb-4 opacity-50" />
                        <p>No invigilation duties assigned yet.</p>
                    </div>
                ) : (
                    <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-muted/50 text-muted-foreground font-semibold border-b">
                                <tr>
                                    <th className="px-6 py-4">Exam</th>
                                    <th className="px-6 py-4">Faculty</th>
                                    <th className="px-6 py-4">Room</th>
                                    <th className="px-6 py-4">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {duties.map(d => (
                                    <tr key={d.id} className="hover:bg-muted/20">
                                        <td className="px-6 py-4 font-medium">{exams.find(e => e.id === d.examId)?.name || d.examId?.slice(0, 8)}</td>
                                        <td className="px-6 py-4">{faculty.find(f => f.id === d.facultyId)?.name || d.facultyId?.slice(0, 8)}</td>
                                        <td className="px-6 py-4 text-muted-foreground">{d.classroomId || 'TBD'}</td>
                                        <td className="px-6 py-4"><Badge variant="outline" className="text-[10px] uppercase">{d.status}</Badge></td>
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
