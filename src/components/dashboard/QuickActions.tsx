import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Grid3X3, UploadCloud, UserCheck } from 'lucide-react';

const quickActions = [
    { label: 'Create New Exam', icon: Plus, description: 'Set up a new examination', variant: 'admin' as const, path: '/admin/exams/create' },
    { label: 'Generate Seating', icon: Grid3X3, description: 'AI-powered seat assignment', variant: 'secondary' as const, path: '/admin-generate-seating' },
    { label: 'Upload Student CSV', icon: UploadCloud, description: 'Batch import students', variant: 'accent' as const, path: '/admin/students/import' },
    { label: 'Assign Invigilators', icon: UserCheck, description: 'Manage invigilation duties', variant: 'outline' as const, path: '/admin/operations/invigilation' },
];

export const QuickActions: React.FC = () => {
    const navigate = useNavigate();

    return (
        <Card className="dashboard-card shadow-sm h-full">
            <CardHeader>
                <CardTitle className="text-xl font-display font-bold text-foreground">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                {quickActions.map((action) => (
                    <Button
                        key={action.label}
                        variant={action.variant}
                        className="w-full justify-start h-auto py-4"
                        onClick={() => navigate(action.path)}
                    >
                        <action.icon className="w-5 h-5 mr-3 shrink-0" />
                        <div className="text-left">
                            <p className="font-semibold text-sm">{action.label}</p>
                            <p className="text-xs opacity-80">{action.description}</p>
                        </div>
                    </Button>
                ))}
            </CardContent>
        </Card>
    );
};
