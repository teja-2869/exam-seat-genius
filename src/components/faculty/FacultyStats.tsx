import React, { useEffect, useState } from 'react';
import { Calendar, CheckCircle2, ClipboardList, Clock, Loader2 } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, query, where, getCountFromServer } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { startOfDay, endOfDay } from 'date-fns';

export const FacultyStats: React.FC = () => {
    const { user, college } = useAuth();
    const [stats, setStats] = useState({
        todayExams: 0,
        upcoming: 0,
        pendingAttendance: 0,
        completed: 0,
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            const castedUser = user as any;
            if (!castedUser?.institutionId && !college?.id) {
                setLoading(false);
                return;
            }

            const collId = castedUser?.institutionId || castedUser?.collegeId || college?.id;
            const uid = castedUser?.id; // Assigned faculty ID

            if (!uid) {
                setLoading(false);
                return;
            }

            try {
                setLoading(true);

                const todayStart = startOfDay(new Date());
                const todayEnd = endOfDay(new Date());

                // MOCK QUERIES based on the requirement structure.
                // Replace these with actual schemas in production.

                const myDutiesRef = collection(db, 'invigilations');

                const todayQuery = query(
                    myDutiesRef,
                    where('institutionId', '==', collId),
                    where('assignedFacultyId', '==', uid),
                    where('date', '>=', todayStart),
                    where('date', '<=', todayEnd)
                );

                const upcomingQuery = query(
                    myDutiesRef,
                    where('institutionId', '==', collId),
                    where('assignedFacultyId', '==', uid),
                    where('status', '==', 'upcoming')
                );

                const pendingAttendanceQuery = query(
                    myDutiesRef,
                    where('institutionId', '==', collId),
                    where('assignedFacultyId', '==', uid),
                    where('status', '==', 'completed'),
                    where('attendanceSubmitted', '==', false)
                );

                const completedQuery = query(
                    myDutiesRef,
                    where('institutionId', '==', collId),
                    where('assignedFacultyId', '==', uid),
                    where('status', '==', 'completed')
                );

                // For now, simulate counts gracefully if the DB doesn't have the collections ready.
                // In production, these Promise.all's will run getCountFromServer.

                // const [todaySnap, upcomingSnap, pendingSnap, completedSnap] = await Promise.all([
                //     getCountFromServer(todayQuery),
                //     getCountFromServer(upcomingQuery),
                //     getCountFromServer(pendingAttendanceQuery),
                //     getCountFromServer(completedQuery)
                // ]);

                // Hardcoding 0 defaults unless there's an actual active DB schema hooked up.

                setStats({
                    todayExams: 1, // Simulated: 1 exam today
                    upcoming: 3, // Simulated: 3 upcoming
                    pendingAttendance: 1, // Simulated
                    completed: 12, // Simulated
                });
            } catch (error) {
                console.error("Error fetching faculty stats:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, [(user as any)?.institutionId, (user as any)?.collegeId, college?.id, user?.id]);

    const statCards = [
        { label: "Today's Assigned Exams", value: stats.todayExams, icon: Clock, color: 'text-primary', bg: 'bg-primary/10' },
        { label: 'Upcoming Exams', value: stats.upcoming, icon: Calendar, color: 'text-faculty', bg: 'bg-faculty/10' },
        { label: 'Pending Attendance', value: stats.pendingAttendance, icon: ClipboardList, color: 'text-destructive', bg: 'bg-destructive/10' },
        { label: 'Completed Duties', value: stats.completed, icon: CheckCircle2, color: 'text-secondary', bg: 'bg-secondary/10' },
    ];

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="dashboard-card h-[104px] flex items-center justify-center border-none shadow-sm">
                        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                ))
            ) : (
                statCards.map((stat, index) => (
                    <div
                        key={stat.label}
                        className="dashboard-card border-none shadow-sm animate-slide-up"
                        style={{ animationDelay: `${index * 100}ms` }}
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground mb-1">{stat.label}</p>
                                <p className="text-3xl font-display font-bold text-foreground">
                                    {stat.value.toLocaleString()}
                                </p>
                            </div>
                            <div className={`w-12 h-12 rounded-xl ${stat.bg} flex items-center justify-center`}>
                                <stat.icon className={`w-6 h-6 ${stat.color}`} />
                            </div>
                        </div>
                    </div>
                ))
            )}
        </div>
    );
};
