import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { UserCog, Save, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { db, auth } from '@/lib/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { updatePassword, updateEmail } from 'firebase/auth';
import { toast } from 'sonner';

export default function AdminAccountSettings() {
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
            await updateDoc(doc(db, 'users', user.id), {
                name: form.name,
                updatedAt: serverTimestamp()
            });

            const firebaseUser = auth.currentUser;
            if (firebaseUser && form.newPassword && form.newPassword === form.confirmPassword) {
                await updatePassword(firebaseUser, form.newPassword);
                toast.success('Password updated');
            } else if (form.newPassword && form.newPassword !== form.confirmPassword) {
                toast.error('Passwords do not match');
                setSaving(false);
                return;
            }

            toast.success('Account settings saved');
        } catch (err: any) {
            console.error(err);
            toast.error(err.message || 'Failed to save');
        } finally {
            setSaving(false);
        }
    };

    return (
        <AdminLayout>
            <div className="max-w-3xl mx-auto space-y-8 animate-fade-in pb-12">
                <div>
                    <div className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
                        <span>Admin</span><span>/</span><span>Settings</span><span>/</span><span className="text-foreground font-medium">Account</span>
                    </div>
                    <h1 className="text-3xl font-display font-bold text-foreground mb-2">Account Settings</h1>
                    <p className="text-muted-foreground">Manage your admin profile and password.</p>
                </div>

                <Card className="dashboard-card">
                    <CardHeader><CardTitle className="flex items-center gap-2"><UserCog className="w-5 h-5 text-primary" /> Profile</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2"><Label>Full Name</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
                        <div className="space-y-2"><Label>Email</Label><Input value={form.email} disabled className="opacity-60" /></div>
                        <div className="border-t pt-4 mt-4">
                            <p className="text-sm font-bold mb-4">Change Password</p>
                        </div>
                        <div className="space-y-2"><Label>New Password</Label><Input type="password" value={form.newPassword} onChange={e => setForm({ ...form, newPassword: e.target.value })} /></div>
                        <div className="space-y-2"><Label>Confirm Password</Label><Input type="password" value={form.confirmPassword} onChange={e => setForm({ ...form, confirmPassword: e.target.value })} /></div>
                        <div className="flex justify-end pt-4 border-t">
                            <Button onClick={handleSave} disabled={saving}>
                                {saving ? <Activity className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />} Save Changes
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AdminLayout>
    );
}
