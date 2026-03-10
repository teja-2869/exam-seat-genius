import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { StudentLayout } from '@/components/layout/StudentLayout';
import { BookOpen, Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

export default function StudentExamsPage() {
    const { user } = useAuth();
    const [exams, setExams] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetch = async () => {
            const institutionId = (user as any)?.collegeId || (user as any)?.institutionId;
            if (!institutionId) { setLoading(false); return; }
            try {
                const snap = await getDocs(query(collection(db, 'exams'), where('institutionId', '==', institutionId), where('status', '==', 'published')));
                const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                data.sort((a: any, b: any) => (a.date > b.date ? -1 : 1));
                setExams(data);
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
                        <span>Student</span><span>/</span><span>Exams</span><span>/</span><span className="text-foreground font-medium">My Exams</span>
                    </div>
                    <h1 className="text-3xl font-display font-bold text-foreground mb-2">My Exams</h1>
                    <p className="text-muted-foreground">View your upcoming examinations.</p>
                </div>

                {loading ? (
                    <div className="h-64 flex items-center justify-center border rounded-xl"><Activity className="animate-spin text-primary w-8 h-8" /></div>
                ) : exams.length === 0 ? (
                    <div className="h-64 flex flex-col items-center justify-center border rounded-xl text-muted-foreground bg-muted/20">
                        <BookOpen className="w-12 h-12 mb-4 opacity-50" />
                        <p>No published exams found.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {exams.map(e => (
                            <Card key={e.id} className="dashboard-card">
                                <CardHeader className="border-b pb-4">
                                    <CardTitle className="text-base">{e.subjectCode} - {e.subjectName}</CardTitle>
                                    <p className="text-xs text-muted-foreground">{e.name}</p>
                                </CardHeader>
                                <CardContent className="pt-4 space-y-2">
                                    <p className="text-sm"><span className="font-semibold">Date:</span> {e.date}</p>
                                    <p className="text-sm"><span className="font-semibold">Time:</span> {e.startTime} - {e.endTime}</p>
                                    <p className="text-sm"><span className="font-semibold">Semester:</span> {e.semester}</p>
                                    <Badge variant="outline" className="text-[10px] uppercase">{e.type}</Badge>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </StudentLayout>
    );
}
