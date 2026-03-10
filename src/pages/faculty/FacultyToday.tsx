import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { FacultyLayout } from '@/components/layout/FacultyLayout';
import { Clock, Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

export default function FacultyToday() {
    const { user } = useAuth();
    const [duties, setDuties] = useState<any[]>([]);
    const [exams, setExams] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const today = new Date().toISOString().split('T')[0];

    useEffect(() => {
        const fetch = async () => {
            if (!user?.id) { setLoading(false); return; }
            const institutionId = (user as any)?.collegeId || (user as any)?.institutionId;
            try {
                const [dSnap, eSnap] = await Promise.all([
                    getDocs(query(collection(db, 'invigilation'), where('facultyId', '==', user.id))),
                    getDocs(query(collection(db, 'exams'), where('institutionId', '==', institutionId)))
                ]);
                const allDuties = dSnap.docs.map(d => ({ id: d.id, ...d.data() }));
                const allExams = eSnap.docs.map(d => ({ id: d.id, ...d.data() }));
                setExams(allExams);
                const todayDuties = allDuties.filter(d => {
                    const exam = allExams.find(e => e.id === d.examId);
                    return exam?.date === today;
                });
                setDuties(todayDuties);
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
                        <span>Faculty</span><span>/</span><span>Duties</span><span>/</span><span className="text-foreground font-medium">Today</span>
                    </div>
                    <h1 className="text-3xl font-display font-bold text-foreground mb-2">Today's Exams</h1>
                    <p className="text-muted-foreground">Your exam duties for {today}.</p>
                </div>

                {loading ? (
                    <div className="h-64 flex items-center justify-center border rounded-xl"><Activity className="animate-spin text-primary w-8 h-8" /></div>
                ) : duties.length === 0 ? (
                    <div className="h-64 flex flex-col items-center justify-center border rounded-xl text-muted-foreground bg-muted/20">
                        <Clock className="w-12 h-12 mb-4 opacity-50" />
                        <p>No exam duties scheduled for today.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {duties.map(d => {
                            const exam = exams.find(e => e.id === d.examId);
                            return (
                                <Card key={d.id} className="dashboard-card border-primary/20">
                                    <CardHeader className="border-b pb-4">
                                        <CardTitle className="text-base">{exam?.name || 'Exam'}</CardTitle>
                                    </CardHeader>
                                    <CardContent className="pt-4 space-y-2">
                                        <p className="text-sm"><span className="font-semibold">Subject:</span> {exam?.subjectCode} - {exam?.subjectName}</p>
                                        <p className="text-sm"><span className="font-semibold">Time:</span> {exam?.startTime} - {exam?.endTime}</p>
                                        <p className="text-sm"><span className="font-semibold">Room:</span> {d.classroomId || 'TBD'}</p>
                                        <Badge variant="default" className="uppercase text-[10px]">{d.status}</Badge>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </div>
        </FacultyLayout>
    );
}
