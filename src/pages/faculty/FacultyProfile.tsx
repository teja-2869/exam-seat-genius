import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { FacultyLayout } from '@/components/layout/FacultyLayout';
import { User, Save, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { db } from '@/lib/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { toast } from 'sonner';

export default function FacultyProfile() {
    const { user } = useAuth();
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({
        name: user?.name || '',
        phone: (user as any)?.phone || ''
    });

    const handleSave = async () => {
        if (!user?.id) return;
        setSaving(true);
        try {
            await updateDoc(doc(db, 'users', user.id), { name: form.name, phone: form.phone, updatedAt: serverTimestamp() });
            toast.success('Profile updated');
        } catch (err) { console.error(err); toast.error('Failed to save'); }
        setSaving(false);
    };

    return (
        <FacultyLayout>
            <div className="max-w-3xl mx-auto space-y-8 animate-fade-in pb-12">
                <div>
                    <div className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
                        <span>Faculty</span><span>/</span><span className="text-foreground font-medium">Profile</span>
                    </div>
                    <h1 className="text-3xl font-display font-bold text-foreground mb-2">My Profile</h1>
                </div>
                <Card className="dashboard-card">
                    <CardHeader><CardTitle className="flex items-center gap-2"><User className="w-5 h-5 text-primary" /> Profile Details</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex gap-3">
                            <Badge variant="outline">Role: Faculty</Badge>
                            <Badge variant="outline">Branch: {user?.branchId || 'N/A'}</Badge>
                        </div>
                        <div className="space-y-2"><Label>Full Name</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
                        <div className="space-y-2"><Label>Email</Label><Input value={user?.email || ''} disabled className="opacity-60" /></div>
                        <div className="space-y-2"><Label>Phone</Label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
                        <div className="flex justify-end pt-4 border-t">
                            <Button onClick={handleSave} disabled={saving}>{saving ? <Activity className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />} Save</Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </FacultyLayout>
    );
}
