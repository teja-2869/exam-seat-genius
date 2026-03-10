import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { StudentLayout } from '@/components/layout/StudentLayout';
import { User, Save, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function StudentProfilePage() {
    const { user } = useAuth();

    return (
        <StudentLayout>
            <div className="max-w-3xl mx-auto space-y-8 animate-fade-in pb-12">
                <div>
                    <div className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
                        <span>Student</span><span>/</span><span className="text-foreground font-medium">Profile</span>
                    </div>
                    <h1 className="text-3xl font-display font-bold text-foreground mb-2">My Profile</h1>
                </div>
                <Card className="dashboard-card">
                    <CardHeader><CardTitle className="flex items-center gap-2"><User className="w-5 h-5 text-primary" /> Student Details</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex gap-3">
                            <Badge variant="outline">Role: Student</Badge>
                            <Badge variant="outline">Branch: {user?.branchId || 'N/A'}</Badge>
                        </div>
                        <div className="space-y-2"><Label>Name</Label><Input value={user?.name || ''} disabled className="opacity-80" /></div>
                        <div className="space-y-2"><Label>Email</Label><Input value={user?.email || ''} disabled className="opacity-60" /></div>
                        <div className="space-y-2"><Label>College ID</Label><Input value={user?.collegeId || ''} disabled className="opacity-60" /></div>
                    </CardContent>
                </Card>
            </div>
        </StudentLayout>
    );
}
