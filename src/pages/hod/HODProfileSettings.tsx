import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { HODLayout } from '@/components/layout/HODLayout';
import { UserCog, Save, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { db, auth } from '@/lib/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { updatePassword } from 'firebase/auth';
import { toast } from 'sonner';

export default function HODProfileSettings() {
    const { user } = useAuth();
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({
        name: user?.name || '',
        email: user?.email || '',
        newPassword: '',
        confirmPassword: ''
    });

    const handleSave = async () => {
        if (!user?.id) return;
        setSaving(true);
        try {
            await updateDoc(doc(db, 'users', user.id), { name: form.name, updatedAt: serverTimestamp() });
            if (form.newPassword) {
                if (form.newPassword !== form.confirmPassword) { toast.error('Passwords do not match'); setSaving(false); return; }
                const fbUser = auth.currentUser;
                if (fbUser) await updatePassword(fbUser, form.newPassword);
            }
            toast.success('Profile updated');
        } catch (err: any) {
            console.error(err);
            toast.error(err.message || 'Failed to save');
        } finally {
            setSaving(false);
        }
    };

    return (
        <HODLayout>
            <div className="max-w-3xl mx-auto space-y-8 animate-fade-in pb-12">
                <div>
                    <div className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
                        <span>HOD</span><span>/</span><span>Settings</span><span>/</span><span className="text-foreground font-medium">Profile</span>
                    </div>
                    <h1 className="text-3xl font-display font-bold text-foreground mb-2">Profile Settings</h1>
                    <p className="text-muted-foreground">Manage your HOD profile and account.</p>
                </div>
                <Card className="dashboard-card">
                    <CardHeader><CardTitle className="flex items-center gap-2"><UserCog className="w-5 h-5 text-primary" /> Profile</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2"><Label>Full Name</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
                        <div className="space-y-2"><Label>Email</Label><Input value={form.email} disabled className="opacity-60" /></div>
                        <div className="border-t pt-4 mt-4"><p className="text-sm font-bold mb-4">Change Password</p></div>
                        <div className="space-y-2"><Label>New Password</Label><Input type="password" value={form.newPassword} onChange={e => setForm({ ...form, newPassword: e.target.value })} /></div>
                        <div className="space-y-2"><Label>Confirm Password</Label><Input type="password" value={form.confirmPassword} onChange={e => setForm({ ...form, confirmPassword: e.target.value })} /></div>
                        <div className="flex justify-end pt-4 border-t">
                            <Button onClick={handleSave} disabled={saving}>{saving ? <Activity className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />} Save</Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </HODLayout>
    );
}
