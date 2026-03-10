import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { StudentLayout } from '@/components/layout/StudentLayout';
import { MapPin, Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

export default function StudentSeatViewPage() {
    const { user } = useAuth();
    const [plans, setPlans] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetch = async () => {
            const institutionId = (user as any)?.collegeId || (user as any)?.institutionId;
            if (!institutionId) { setLoading(false); return; }
            try {
                const snap = await getDocs(query(collection(db, 'seatingPlans'), where('institutionId', '==', institutionId)));
                const allPlans = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                // Filter plans that contain this student
                const myPlans = allPlans.filter(p =>
                    p.seatingPlan?.some((seat: any) =>
                        seat.leftSeat?.studentId === user?.id || seat.rightSeat?.studentId === user?.id
                    )
                );
                setPlans(myPlans);
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
                        <span>Student</span><span>/</span><span>Exams</span><span>/</span><span className="text-foreground font-medium">Seat Details</span>
                    </div>
                    <h1 className="text-3xl font-display font-bold text-foreground mb-2">Seat Details</h1>
                    <p className="text-muted-foreground">View your assigned seat with classroom layout.</p>
                </div>

                {loading ? (
                    <div className="h-64 flex items-center justify-center border rounded-xl"><Activity className="animate-spin text-primary w-8 h-8" /></div>
                ) : plans.length === 0 ? (
                    <div className="h-64 flex flex-col items-center justify-center border rounded-xl text-muted-foreground bg-muted/20">
                        <MapPin className="w-12 h-12 mb-4 opacity-50" />
                        <p>No seat assignments found for you yet.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {plans.map(p => {
                            const mySeat = p.seatingPlan?.find((s: any) =>
                                s.leftSeat?.studentId === user?.id || s.rightSeat?.studentId === user?.id
                            );
                            const side = mySeat?.leftSeat?.studentId === user?.id ? 'Left' : 'Right';
                            return (
                                <Card key={p.id} className="dashboard-card">
                                    <CardHeader className="border-b pb-4"><CardTitle className="text-base">Classroom: {p.classroomId}</CardTitle></CardHeader>
                                    <CardContent className="pt-4 space-y-2">
                                        <p className="text-sm"><span className="font-semibold">Row:</span> {mySeat?.row}</p>
                                        <p className="text-sm"><span className="font-semibold">Column:</span> {mySeat?.column}</p>
                                        <p className="text-sm"><span className="font-semibold">Side:</span> {side}</p>
                                        <Badge variant="default">{p.examId?.slice(0, 8)}</Badge>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </div>
        </StudentLayout>
    );
}
