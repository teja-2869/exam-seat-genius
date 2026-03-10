import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { HODLayout } from '@/components/layout/HODLayout';
import { UserCheck, Activity, Phone, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { toast } from 'sonner';

export default function HODFacultyList() {
    const { college, user } = useAuth();
    const [faculty, setFaculty] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetch = async () => {
            const institutionId = college?.id || (user as any)?.institutionId;
            if (!institutionId) { setLoading(false); return; }
            try {
                const snap = await getDocs(query(collection(db, 'users'), where('institutionId', '==', institutionId), where('role', '==', 'faculty')));
                setFaculty(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            } catch (err) { console.error(err); toast.error('Failed to load faculty'); }
            setLoading(false);
        };
        fetch();
    }, [college, user]);

    return (
        <HODLayout>
            <div className="max-w-7xl mx-auto space-y-8 animate-fade-in pb-12">
                <div>
                    <div className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
                        <span>HOD</span><span>/</span><span>Department</span><span>/</span><span className="text-foreground font-medium">Faculty List</span>
                    </div>
                    <h1 className="text-3xl font-display font-bold text-foreground mb-2">Faculty List</h1>
                    <p className="text-muted-foreground">View faculty members in your department.</p>
                </div>

                {loading ? (
                    <div className="h-64 flex items-center justify-center border rounded-xl"><Activity className="animate-spin text-primary w-8 h-8" /></div>
                ) : faculty.length === 0 ? (
                    <div className="h-64 flex flex-col items-center justify-center border rounded-xl text-muted-foreground bg-muted/20">
                        <UserCheck className="w-12 h-12 mb-4 opacity-50" />
                        <p>No faculty members found.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {faculty.map(fac => (
                            <Card key={fac.id} className="dashboard-card">
                                <CardHeader className="border-b pb-4">
                                    <CardTitle className="flex items-center gap-2 text-base"><UserCheck className="w-4 h-4 text-primary" /> {fac.name}</CardTitle>
                                    <p className="text-xs text-muted-foreground">{fac.branchId}</p>
                                </CardHeader>
                                <CardContent className="pt-4 space-y-3">
                                    <div className="flex justify-between items-center bg-muted/50 p-2 rounded-md">
                                        <span className="text-xs font-semibold uppercase">Eligibility</span>
                                        {fac.examEligibility === false ? <XCircle className="w-4 h-4 text-destructive" /> : <CheckCircle className="w-4 h-4 text-green-500" />}
                                    </div>
                                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                        <Phone className="w-4 h-4 shrink-0" />
                                        <span>{fac.phone || 'No Phone'}</span>
                                    </div>
                                    <Badge variant={fac.availabilityStatus === 'Available' ? 'default' : 'secondary'} className="text-[10px] uppercase">{fac.availabilityStatus || 'Available'}</Badge>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </HODLayout>
    );
}
