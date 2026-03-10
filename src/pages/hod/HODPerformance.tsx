import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { HODLayout } from '@/components/layout/HODLayout';
import { BarChart3, Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { toast } from 'sonner';

export default function HODPerformance() {
    const { college, user } = useAuth();
    const [stats, setStats] = useState({ students: 0, faculty: 0, exams: 0, attendance: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetch = async () => {
            const institutionId = college?.id || (user as any)?.institutionId;
            if (!institutionId) { setLoading(false); return; }
            try {
                const [sSnap, fSnap, eSnap, aSnap] = await Promise.all([
                    getDocs(query(collection(db, 'students'), where('institutionId', '==', institutionId))),
                    getDocs(query(collection(db, 'users'), where('institutionId', '==', institutionId), where('role', '==', 'faculty'))),
                    getDocs(query(collection(db, 'exams'), where('institutionId', '==', institutionId))),
                    getDocs(query(collection(db, 'attendance'), where('institutionId', '==', institutionId)))
                ]);
                setStats({ students: sSnap.size, faculty: fSnap.size, exams: eSnap.size, attendance: aSnap.size });
            } catch (err) { console.error(err); toast.error('Failed to load metrics'); }
            setLoading(false);
        };
        fetch();
    }, [college, user]);

    if (loading) return <HODLayout><div className="h-64 flex items-center justify-center"><Activity className="animate-spin text-primary w-8 h-8" /></div></HODLayout>;

    return (
        <HODLayout>
            <div className="max-w-7xl mx-auto space-y-8 animate-fade-in pb-12">
                <div>
                    <div className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
                        <span>HOD</span><span>/</span><span>Reports</span><span>/</span><span className="text-foreground font-medium">Performance</span>
                    </div>
                    <h1 className="text-3xl font-display font-bold text-foreground mb-2">Branch Performance Metrics</h1>
                    <p className="text-muted-foreground">Department-wide statistics at a glance.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <Card className="dashboard-card"><CardContent className="pt-6 text-center"><p className="text-4xl font-bold text-primary">{stats.students}</p><p className="text-sm text-muted-foreground mt-1">Total Students</p></CardContent></Card>
                    <Card className="dashboard-card"><CardContent className="pt-6 text-center"><p className="text-4xl font-bold text-primary">{stats.faculty}</p><p className="text-sm text-muted-foreground mt-1">Faculty Members</p></CardContent></Card>
                    <Card className="dashboard-card"><CardContent className="pt-6 text-center"><p className="text-4xl font-bold text-primary">{stats.exams}</p><p className="text-sm text-muted-foreground mt-1">Exams Scheduled</p></CardContent></Card>
                    <Card className="dashboard-card"><CardContent className="pt-6 text-center"><p className="text-4xl font-bold text-primary">{stats.attendance}</p><p className="text-sm text-muted-foreground mt-1">Attendance Records</p></CardContent></Card>
                </div>

                <Card className="dashboard-card">
                    <CardHeader><CardTitle className="flex items-center gap-2"><BarChart3 className="w-5 h-5 text-primary" /> Department Summary</CardTitle></CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground text-sm">
                            Your department has {stats.students} enrolled students, {stats.faculty} faculty members, {stats.exams} scheduled exams, and {stats.attendance} attendance records logged.
                        </p>
                    </CardContent>
                </Card>
            </div>
        </HODLayout>
    );
}
