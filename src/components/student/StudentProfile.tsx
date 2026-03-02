import React from 'react';
import { StudentLayout } from '@/components/layout/StudentLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { User, Mail, GraduationCap, Building2, School } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

export const StudentProfile: React.FC = () => {
    const { user, college } = useAuth();

    return (
        <StudentLayout>
            <div className="max-w-3xl mx-auto space-y-8 animate-fade-in">

                {/* Header */}
                <div>
                    <div className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
                        <span>Student</span>
                        <span>/</span>
                        <span className="text-foreground font-medium">Profile</span>
                    </div>
                    <h1 className="text-3xl font-display font-bold text-foreground mb-2">
                        My Profile
                    </h1>
                    <p className="text-muted-foreground flex items-center gap-2">
                        View your personal and academic details.
                    </p>
                </div>

                <Card className="dashboard-card border-none shadow-sm animate-slide-up">
                    <CardHeader className="border-b border-border pb-6 mb-6">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-2xl bg-panel-student/10 flex items-center justify-center shrink-0 border border-panel-student/20">
                                <User className="w-8 h-8 text-panel-student" />
                            </div>
                            <div>
                                <CardTitle className="text-xl font-display font-bold text-foreground">
                                    Personal Information
                                </CardTitle>
                                <CardDescription className="text-sm text-muted-foreground">
                                    Your registered identity details in Exam Seat Genius.
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6">

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">Full Name</Label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input value={user?.name || ''} readOnly className="pl-10 bg-muted/50 focus-visible:ring-0 opacity-100 font-medium" />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">Email Address</Label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input value={user?.email || ''} readOnly className="pl-10 bg-muted/50 focus-visible:ring-0 opacity-100 font-medium" />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">Roll Number / ID</Label>
                                <div className="relative">
                                    <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input value={user?.id || ''} readOnly className="pl-10 bg-muted/50 focus-visible:ring-0 opacity-100 font-medium" />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">Branch</Label>
                                <div className="relative">
                                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input value={user?.branchId || ''} readOnly className="pl-10 bg-muted/50 focus-visible:ring-0 opacity-100 font-medium" />
                                </div>
                            </div>

                            <div className="space-y-2 md:col-span-2">
                                <Label className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">Institution</Label>
                                <div className="relative">
                                    <School className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input value={college?.name || ''} readOnly className="pl-10 bg-muted/50 focus-visible:ring-0 opacity-100 font-medium" />
                                </div>
                            </div>
                        </div>

                        <div className="pt-6 border-t border-border mt-6">
                            <Button variant="outline" className="w-full sm:w-auto" disabled>
                                Request Profile Update
                            </Button>
                            <p className="text-xs text-muted-foreground mt-3">
                                Profile updates must be processed through your HOD or Admin panel due to strict data integrity policies.
                            </p>
                        </div>

                    </CardContent>
                </Card>

            </div>
        </StudentLayout>
    );
};

export default StudentProfile;
