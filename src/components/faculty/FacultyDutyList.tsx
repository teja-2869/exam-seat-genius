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
            const castedUser = user as any;
            if (!castedUser?.institutionId && !college?.id) {
                setLoading(false);
                return;
            }

            const collId = castedUser?.institutionId || castedUser?.collegeId || college?.id;
            const uid = castedUser?.uid || castedUser?.id;

            if (!uid) {
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                const q = query(
                    collection(db, 'invigilations'),
                    where('institutionId', '==', collId),
                    where('assignedFacultyId', '==', uid),
                    where('status', '==', 'upcoming')
                );
                const snap = await getDocs(q);
                const fetchedDuties: Duty[] = snap.docs.map(doc => {
                    const data = doc.data();
                    return {
                        id: doc.id,
                        exam: data.sessionName || 'Exam Session',
                        subject: data.facultyDepartment || 'Department Room',
                        date: data.date,
                        time: `${data.startTime} - ${data.endTime}`,
                        room: data.roomNumber || '',
                        block: data.blockNumber ? `Block ${data.blockNumber}` : '',
                        floor: Number(data.floorNumber) || 0,
                        students: Number(data.studentCount) || 0,
                        status: data.status || 'upcoming'
                    };
                });
                
                // Sort by date chronologically
                fetchedDuties.sort((a, b) => a.date.localeCompare(b.date));

                setDuties(fetchedDuties);
            } catch (err) {
                console.error("Error fetching duties:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchDuties();
    }, [user, college]);

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
