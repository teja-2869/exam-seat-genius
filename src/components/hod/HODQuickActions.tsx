import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, Eye, UserCheck, Building2 } from 'lucide-react';

const quickActions = [
    { label: 'Upload Students', icon: Upload, description: 'Import branch student data', variant: 'hod' as const, actionKey: 'Upload Students' },
    { label: 'Manage Classrooms', icon: Building2, description: 'Add or edit classroom details', variant: 'secondary' as const, actionKey: 'Manage Classrooms' },
    { label: 'View Seating', icon: Eye, description: 'Check seating arrangements', variant: 'outline' as const, actionKey: 'View Seating' },
    { label: 'View Invigilation', icon: UserCheck, description: 'See invigilation duties', variant: 'outline' as const, actionKey: 'View Invigilation' },
];

export interface HODQuickActionsProps {
    onAction: (actionKey: string) => void;
}

export const HODQuickActions: React.FC<HODQuickActionsProps> = ({ onAction }) => {
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
                        onClick={() => onAction(action.actionKey)}
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
