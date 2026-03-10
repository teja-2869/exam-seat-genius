import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Settings, Save, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { toast } from 'sonner';

export default function AdminInstitutionSettings() {
    const { college, user } = useAuth();
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);

    const [form, setForm] = useState({
        name: '',
        code: '',
        location: '',
        email: '',
        phone: '',
        website: '',
        academicYear: '',
        principalName: ''
    });

    const getInstitutionId = () => college?.id || (user as any)?.institutionId;

    useEffect(() => {
        const load = async () => {
            const id = getInstitutionId();
            if (!id) { setLoading(false); return; }
            try {
                const snap = await getDoc(doc(db, 'institutions', id));
                if (snap.exists()) {
                    const d = snap.data();
                    setForm({
                        name: d.name || '',
                        code: d.code || '',
                        location: d.location || '',
                        email: d.email || '',
                        phone: d.phone || '',
                        website: d.website || '',
                        academicYear: d.academicYear || '',
                        principalName: d.principalName || ''
                    });
                }
            } catch (err) { console.error(err); }
            setLoading(false);
        };
        load();
    }, [college, user]);

    const handleSave = async () => {
        const id = getInstitutionId();
        if (!id) return;
        setSaving(true);
        try {
            await setDoc(doc(db, 'institutions', id), { ...form, updatedAt: serverTimestamp() }, { merge: true });
            toast.success('Settings saved');
        } catch (err) {
            console.error(err);
            toast.error('Failed to save');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <AdminLayout><div className="h-64 flex items-center justify-center"><Activity className="animate-spin text-primary w-8 h-8" /></div></AdminLayout>;

    return (
        <AdminLayout>
            <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-12">
                <div>
                    <div className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
                        <span>Admin</span><span>/</span><span>Settings</span><span>/</span><span className="text-foreground font-medium">Institution</span>
                    </div>
                    <h1 className="text-3xl font-display font-bold text-foreground mb-2">Institution Settings</h1>
                    <p className="text-muted-foreground">Configure college-wide settings, academic years, and policies.</p>
                </div>

                <Card className="dashboard-card">
                    <CardHeader><CardTitle className="flex items-center gap-2"><Settings className="w-5 h-5 text-primary" /> General Information</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2"><Label>Institution Name</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
                            <div className="space-y-2"><Label>Code</Label><Input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} /></div>
                            <div className="space-y-2"><Label>Location</Label><Input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} /></div>
                            <div className="space-y-2"><Label>Email</Label><Input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
                            <div className="space-y-2"><Label>Phone</Label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
                            <div className="space-y-2"><Label>Website</Label><Input value={form.website} onChange={e => setForm({ ...form, website: e.target.value })} /></div>
                            <div className="space-y-2"><Label>Academic Year</Label><Input placeholder="e.g., 2024-2025" value={form.academicYear} onChange={e => setForm({ ...form, academicYear: e.target.value })} /></div>
                            <div className="space-y-2"><Label>Principal Name</Label><Input value={form.principalName} onChange={e => setForm({ ...form, principalName: e.target.value })} /></div>
                        </div>
                        <div className="flex justify-end pt-4 border-t">
                            <Button onClick={handleSave} disabled={saving}>
                                {saving ? <Activity className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />} Save Settings
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AdminLayout>
    );
}
