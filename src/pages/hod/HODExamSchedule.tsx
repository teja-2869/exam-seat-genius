import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { HODLayout } from '@/components/layout/HODLayout';
import { Calendar, Activity } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { toast } from 'sonner';

export default function HODExamSchedule() {
    const { college, user } = useAuth();
    const [exams, setExams] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetch = async () => {
            const institutionId = college?.id || (user as any)?.institutionId;
            if (!institutionId) { setLoading(false); return; }
            try {
                const snap = await getDocs(query(collection(db, 'exams'), where('institutionId', '==', institutionId)));
                const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                data.sort((a: any, b: any) => (a.date > b.date ? -1 : 1));
                setExams(data);
            } catch (err) { console.error(err); toast.error('Failed to load exams'); }
            setLoading(false);
        };
        fetch();
    }, [college, user]);

    return (
        <HODLayout>
            <div className="max-w-7xl mx-auto space-y-8 animate-fade-in pb-12">
                <div>
                    <div className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
                        <span>HOD</span><span>/</span><span>Exams</span><span>/</span><span className="text-foreground font-medium">Schedule</span>
                    </div>
                    <h1 className="text-3xl font-display font-bold text-foreground mb-2">Exam Schedule</h1>
                    <p className="text-muted-foreground">View upcoming and past exam schedules.</p>
                </div>

                {loading ? (
                    <div className="h-64 flex items-center justify-center border rounded-xl"><Activity className="animate-spin text-primary w-8 h-8" /></div>
                ) : exams.length === 0 ? (
                    <div className="h-64 flex flex-col items-center justify-center border rounded-xl text-muted-foreground bg-muted/20">
                        <Calendar className="w-12 h-12 mb-4 opacity-50" />
                        <p>No exams scheduled.</p>
                    </div>
                ) : (
                    <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-muted/50 text-muted-foreground font-semibold border-b">
                                <tr>
                                    <th className="px-6 py-4">Subject</th>
                                    <th className="px-6 py-4">Exam</th>
                                    <th className="px-6 py-4">Date</th>
                                    <th className="px-6 py-4">Time</th>
                                    <th className="px-6 py-4">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {exams.map(e => (
                                    <tr key={e.id} className="hover:bg-muted/20">
                                        <td className="px-6 py-4 font-bold">{e.subjectCode} - {e.subjectName}</td>
                                        <td className="px-6 py-4">{e.name}</td>
                                        <td className="px-6 py-4">{e.date}</td>
                                        <td className="px-6 py-4 text-muted-foreground">{e.startTime} - {e.endTime}</td>
                                        <td className="px-6 py-4"><Badge variant="outline" className="text-[10px] uppercase">{e.status}</Badge></td>
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
