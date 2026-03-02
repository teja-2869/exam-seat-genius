import React, { useEffect, useState } from 'react';
import { Building2, Users, GraduationCap, ClipboardList, Loader2 } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, query, where, getCountFromServer } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';

export const KPICards: React.FC = () => {
    const { user, college } = useAuth();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState([
        { label: 'Total Students', value: 0, icon: Users, color: 'text-primary', bg: 'bg-primary/10' },
        { label: 'Faculty Members', value: 0, icon: GraduationCap, color: 'text-secondary', bg: 'bg-secondary/10' },
        { label: 'Total Rooms', value: 0, icon: Building2, color: 'text-panel-student', bg: 'bg-panel-student/10' },
        { label: 'Active Exams', value: 0, icon: ClipboardList, color: 'text-accent', bg: 'bg-accent/10' },
    ]);

    useEffect(() => {
        const fetchStats = async () => {
            if (!(user as any)?.institutionId && !college?.id) {
                setLoading(false);
                return;
            }

            const collId = (user as any)?.institutionId || college?.id;

            try {
                setLoading(true);

                const studentsQuery = query(collection(db, 'users'), where('institutionId', '==', collId), where('role', '==', 'STUDENT'));
                const facultyQuery = query(collection(db, 'users'), where('institutionId', '==', collId), where('role', '==', 'FACULTY'));
                const roomsQuery = query(collection(db, 'rooms'), where('institutionId', '==', collId));
                const examsQuery = query(collection(db, 'exams'), where('institutionId', '==', collId), where('status', 'in', ['Active', 'Published', 'Scheduled']));

                const [studentsSnap, facultySnap, roomsSnap, examsSnap] = await Promise.all([
                    getCountFromServer(studentsQuery),
                    getCountFromServer(facultyQuery),
                    getCountFromServer(roomsQuery),
                    getCountFromServer(examsQuery),
                ]);

                setStats([
                    { label: 'Total Students', value: studentsSnap.data().count, icon: Users, color: 'text-primary', bg: 'bg-primary/10' },
                    { label: 'Faculty Members', value: facultySnap.data().count, icon: GraduationCap, color: 'text-secondary', bg: 'bg-secondary/10' },
                    { label: 'Total Rooms', value: roomsSnap.data().count, icon: Building2, color: 'text-panel-student', bg: 'bg-panel-student/10' },
                    { label: 'Active Exams', value: examsSnap.data().count, icon: ClipboardList, color: 'text-accent', bg: 'bg-accent/10' },
                ]);
            } catch (error) {
                console.error("Error fetching admin stats:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, [(user as any)?.institutionId, college?.id]);

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {stats.map((stat, index) => (
                <div
                    key={stat.label}
                    className="dashboard-card animate-slide-up bg-card"
                    style={{ animationDelay: `${index * 100}ms` }}
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground mb-1">{stat.label}</p>
                            {loading ? (
                                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground mt-2" />
                            ) : (
                                <p className="text-3xl font-display font-bold text-foreground">
                                    {stat.value.toLocaleString()}
                                </p>
                            )}
                        </div>
                        <div className={`w-12 h-12 rounded-xl ${stat.bg} flex items-center justify-center`}>
                            <stat.icon className={`w-6 h-6 ${stat.color}`} />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};
