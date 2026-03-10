import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { ClipboardList, Activity, Eye, Trash2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export default function AdminSeatingPlans() {
    const { college, user } = useAuth();
    const navigate = useNavigate();
    const [plans, setPlans] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    const getInstitutionId = () => college?.id || (user as any)?.institutionId;

    const fetchPlans = async () => {
        const institutionId = getInstitutionId();
        if (!institutionId) { setLoading(false); return; }
        try {
            const snap = await getDocs(query(collection(db, 'seatingPlans'), where('institutionId', '==', institutionId)));
            setPlans(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (err) {
            console.error(err);
            toast.error('Failed to load seating plans');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchPlans(); }, [college, user]);

    const handleDelete = async () => {
        if (!deleteId) return;
        try {
            await deleteDoc(doc(db, 'seatingPlans', deleteId));
            setDeleteId(null);
            toast.success('Seating plan deleted');
            fetchPlans();
        } catch (err) {
            console.error(err);
            toast.error('Failed to delete');
        }
    };

    return (
        <AdminLayout>
            <div className="max-w-7xl mx-auto space-y-8 animate-fade-in pb-12">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
                            <span>Admin</span><span>/</span><span>Exams</span><span>/</span><span className="text-foreground font-medium">Seating Plans</span>
                        </div>
                        <h1 className="text-3xl font-display font-bold text-foreground mb-2">Seating Plans</h1>
                        <p className="text-muted-foreground">View, validate, and publish AI-generated seating arrangements.</p>
                    </div>
                    <Button onClick={() => navigate('/admin-generate-seating')}>Generate New Plan</Button>
                </div>

                {loading ? (
                    <div className="h-64 flex items-center justify-center border rounded-xl"><Activity className="animate-spin text-primary w-8 h-8" /></div>
                ) : plans.length === 0 ? (
                    <div className="h-64 flex flex-col items-center justify-center border rounded-xl text-muted-foreground bg-muted/20">
                        <ClipboardList className="w-12 h-12 mb-4 opacity-50" />
                        <p>No seating plans generated yet. Use AI Generate to create one.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {plans.map((plan) => (
                            <Card key={plan.id} className="dashboard-card">
                                <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
                                    <CardTitle className="text-base flex items-center gap-2"><ClipboardList className="w-4 h-4 text-primary" /> {plan.examId?.slice(0, 8)}...</CardTitle>
                                    <Badge variant="outline">{plan.seatingPlan?.length || 0} seats</Badge>
                                </CardHeader>
                                <CardContent className="pt-4 space-y-3">
                                    <p className="text-xs text-muted-foreground">Classroom: {plan.classroomId}</p>
                                    <p className="text-xs text-muted-foreground">Generated: {plan.generatedAt?.toDate?.()?.toLocaleDateString() || 'N/A'}</p>
                                    <div className="flex gap-2 pt-2">
                                        <Button variant="outline" size="sm" className="flex-1"><Eye className="w-3 h-3 mr-1" /> View</Button>
                                        <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setDeleteId(plan.id)}><Trash2 className="w-3 h-3" /></Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}

                <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
                    <DialogContent>
                        <DialogHeader><DialogTitle>Delete Seating Plan</DialogTitle></DialogHeader>
                        <div className="py-4">
                            <div className="flex gap-4 p-4 bg-destructive/10 text-destructive rounded-lg items-start">
                                <AlertCircle className="w-5 h-5 shrink-0" />
                                <p className="text-sm">This will permanently remove this seating arrangement.</p>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
                            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </AdminLayout>
    );
}
