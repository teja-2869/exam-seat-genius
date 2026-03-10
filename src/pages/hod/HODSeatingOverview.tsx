import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { HODLayout } from '@/components/layout/HODLayout';
import { Eye, Activity } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { toast } from 'sonner';

export default function HODSeatingOverview() {
    const { college, user } = useAuth();
    const [plans, setPlans] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetch = async () => {
            const institutionId = college?.id || (user as any)?.institutionId;
            if (!institutionId) { setLoading(false); return; }
            try {
                const snap = await getDocs(query(collection(db, 'seatingPlans'), where('institutionId', '==', institutionId)));
                setPlans(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            } catch (err) { console.error(err); toast.error('Failed to load seating plans'); }
            setLoading(false);
        };
        fetch();
    }, [college, user]);

    return (
        <HODLayout>
            <div className="max-w-7xl mx-auto space-y-8 animate-fade-in pb-12">
                <div>
                    <div className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
                        <span>HOD</span><span>/</span><span>Exams</span><span>/</span><span className="text-foreground font-medium">Seating Overview</span>
                    </div>
                    <h1 className="text-3xl font-display font-bold text-foreground mb-2">Seating Overview</h1>
                    <p className="text-muted-foreground">Read-only view of published seating arrangements.</p>
                </div>

                {loading ? (
                    <div className="h-64 flex items-center justify-center border rounded-xl"><Activity className="animate-spin text-primary w-8 h-8" /></div>
                ) : plans.length === 0 ? (
                    <div className="h-64 flex flex-col items-center justify-center border rounded-xl text-muted-foreground bg-muted/20">
                        <Eye className="w-12 h-12 mb-4 opacity-50" />
                        <p>No seating plans published yet.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {plans.map(plan => (
                            <Card key={plan.id} className="dashboard-card">
                                <CardHeader className="border-b pb-4">
                                    <CardTitle className="text-base">Plan: {plan.examId?.slice(0, 8)}...</CardTitle>
                                </CardHeader>
                                <CardContent className="pt-4 space-y-2">
                                    <p className="text-xs text-muted-foreground">Classroom: {plan.classroomId}</p>
                                    <p className="text-xs text-muted-foreground">Seats: {plan.seatingPlan?.length || 0}</p>
                                    <Badge variant="outline">{plan.generatedAt?.toDate?.()?.toLocaleDateString() || 'Generated'}</Badge>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </HODLayout>
    );
}
