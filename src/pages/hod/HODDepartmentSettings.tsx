import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { HODLayout } from '@/components/layout/HODLayout';
import { Settings, Save, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { toast } from 'sonner';

export default function HODDepartmentSettings() {
    const { college, user } = useAuth();
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState({ departmentName: '', shortCode: '', maxStudents: '', hodContact: '' });

    const getInstitutionId = () => college?.id || (user as any)?.institutionId;

    useEffect(() => {
        const load = async () => {
            const id = getInstitutionId();
            const branchId = (user as any)?.branchId;
            if (!id || !branchId) { setLoading(false); return; }
            try {
                const snap = await getDoc(doc(db, 'settings', `dept_${branchId}`));
                if (snap.exists()) {
                    const d = snap.data();
                    setForm({ departmentName: d.departmentName || '', shortCode: d.shortCode || '', maxStudents: d.maxStudents || '', hodContact: d.hodContact || '' });
                }
            } catch (err) { console.error(err); }
            setLoading(false);
        };
        load();
    }, [college, user]);

    const handleSave = async () => {
        const branchId = (user as any)?.branchId;
        if (!branchId) return;
        setSaving(true);
        try {
            await setDoc(doc(db, 'settings', `dept_${branchId}`), {
                ...form, institutionId: getInstitutionId(), updatedAt: serverTimestamp()
            }, { merge: true });
            toast.success('Department settings saved');
        } catch (err) { console.error(err); toast.error('Failed to save'); }
        setSaving(false);
    };

    if (loading) return <HODLayout><div className="h-64 flex items-center justify-center"><Activity className="animate-spin text-primary w-8 h-8" /></div></HODLayout>;

    return (
        <HODLayout>
            <div className="max-w-3xl mx-auto space-y-8 animate-fade-in pb-12">
                <div>
                    <div className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
                        <span>HOD</span><span>/</span><span>Settings</span><span>/</span><span className="text-foreground font-medium">Department</span>
                    </div>
                    <h1 className="text-3xl font-display font-bold text-foreground mb-2">Department Settings</h1>
                    <p className="text-muted-foreground">Configure department-specific settings.</p>
                </div>
                <Card className="dashboard-card">
                    <CardHeader><CardTitle className="flex items-center gap-2"><Settings className="w-5 h-5 text-primary" /> Settings</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2"><Label>Department Name</Label><Input value={form.departmentName} onChange={e => setForm({ ...form, departmentName: e.target.value })} /></div>
                            <div className="space-y-2"><Label>Short Code</Label><Input placeholder="e.g., CSE" value={form.shortCode} onChange={e => setForm({ ...form, shortCode: e.target.value })} /></div>
                            <div className="space-y-2"><Label>Max Students</Label><Input type="number" value={form.maxStudents} onChange={e => setForm({ ...form, maxStudents: e.target.value })} /></div>
                            <div className="space-y-2"><Label>HOD Contact</Label><Input value={form.hodContact} onChange={e => setForm({ ...form, hodContact: e.target.value })} /></div>
                        </div>
                        <div className="flex justify-end pt-4 border-t">
                            <Button onClick={handleSave} disabled={saving}>{saving ? <Activity className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />} Save</Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </HODLayout>
    );
}
