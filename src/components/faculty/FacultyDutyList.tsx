import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Calendar, Clock, MapPin, Users, ClipboardList } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';

export interface Duty {
    id: string;
    exam: string;
    subject: string;
    date: string;
    time: string;
    room: string;
    block: string;
    floor: number;
    students: number;
    status: 'upcoming' | 'completed';
}

export const FacultyDutyList: React.FC = () => {
    const { user, college } = useAuth();
    const [duties, setDuties] = useState<Duty[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDuties = async () => {
            // Mock data for immediate operational functionality (assuming backend lacks this active collection)
            const mockDuties: Duty[] = [
                {
                    id: '1',
                    exam: 'Data Structures - Internal',
                    subject: 'CS301',
                    date: 'Jan 15, 2025',
                    time: '10:00 AM - 1:00 PM',
                    room: '1101',
                    block: 'Block 1',
                    floor: 1,
                    students: 45,
                    status: 'upcoming'
                },
                {
                    id: '2',
                    exam: 'Database Management - External',
                    subject: 'CS302',
                    date: 'Jan 18, 2025',
                    time: '2:00 PM - 5:00 PM',
                    room: '1201',
                    block: 'Block 1',
                    floor: 2,
                    students: 52,
                    status: 'upcoming'
                },
            ];

            setDuties(mockDuties);
            setLoading(false);
        };

        fetchDuties();
    }, [(user as any)?.institutionId, (user as any)?.collegeId, college?.id, user?.id]);

    return (
        <Card className="dashboard-card border-none shadow-sm h-full flex flex-col">
            <CardHeader>
                <CardTitle className="text-xl font-display font-bold">Upcoming Duties</CardTitle>
                <CardDescription>Your next scheduled invigilation assignments</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto">
                <div className="space-y-4">
                    {duties.map((duty) => (
                        <div
                            key={duty.id}
                            className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-xl border border-border bg-card hover:border-accent transition-colors"
                        >
                            <div className="flex items-start gap-4">
                                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0 bg-accent/10">
                                    <ClipboardList className="w-5 h-5 sm:w-6 sm:h-6 text-accent" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
                                        {duty.exam}
                                        <Badge variant="outline" className="text-[10px] uppercase">{duty.status}</Badge>
                                    </h3>
                                    <p className="text-xs text-muted-foreground mb-2 mt-0.5">{duty.subject}</p>

                                    <div className="flex flex-wrap gap-2 sm:gap-4 text-xs">
                                        <span className="flex items-center gap-1 text-muted-foreground font-medium">
                                            <Calendar className="w-3.5 h-3.5" /> {duty.date}
                                        </span>
                                        <span className="flex items-center gap-1 text-muted-foreground font-medium">
                                            <Clock className="w-3.5 h-3.5" /> {duty.time}
                                        </span>
                                        <span className="flex items-center gap-1 text-muted-foreground font-medium">
                                            <MapPin className="w-3.5 h-3.5" /> {duty.block} - Room {duty.room}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}

                    {duties.length === 0 && !loading && (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <ClipboardList className="w-12 h-12 text-muted-foreground/30 mb-3" />
                            <p className="text-sm font-medium text-foreground">No upcoming duties</p>
                            <p className="text-xs text-muted-foreground mt-1">Check back later for new schedules.</p>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};
