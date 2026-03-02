import React, { useEffect, useState } from 'react';
import { Users, UserCheck, ClipboardList, BookOpen, UserPlus, Loader2 } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, query, where, getCountFromServer } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';

export const DepartmentStats: React.FC = () => {
    const { user, college } = useAuth();
    const [stats, setStats] = useState({
        students: 0,
        faculty: 0,
        exams: 0,
        invigilations: 0,
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            const castedUser = user as any;
            if (!castedUser?.institutionId && !college?.id) {
                setLoading(false);
                return;
            }

            const collId = castedUser?.institutionId || college?.id;
            const branchId = castedUser?.branchId; // Enforcing branch isolation

            if (!branchId) {
                setLoading(false);
                return;
            }

            try {
                setLoading(true);

                // Department Students
                const studentsQuery = query(
                    collection(db, 'users'),
                    where('institutionId', '==', collId),
                    where('role', '==', 'student'),
                    where('branchId', '==', branchId)
                );

                // Department Faculty
                const facultyQuery = query(
                    collection(db, 'users'),
                    where('institutionId', '==', collId),
                    where('role', '==', 'faculty'),
                    where('branchId', '==', branchId)
                );

                // Upcoming Exams for branch
                const examsQuery = query(
                    collection(db, 'exams'),
                    where('institutionId', '==', collId),
                    where('branchId', '==', branchId),
                    where('status', '==', 'Scheduled')
                );

                // Assigned Invigilations for branch
                const invigilationQuery = query(
                    collection(db, 'invigilations'),
                    where('institutionId', '==', collId),
                    where('branchId', '==', branchId)
                );

                const [
                    studentsSnap,
                    facultySnap,
                    examsSnap,
                    invigilationSnap
                ] = await Promise.all([
                    getCountFromServer(studentsQuery),
                    getCountFromServer(facultyQuery),
                    getCountFromServer(examsQuery),
                    getCountFromServer(invigilationQuery)
                ]);

                setStats({
                    students: studentsSnap.data().count,
                    faculty: facultySnap.data().count,
                    exams: examsSnap.data().count,
                    invigilations: invigilationSnap.data().count, // Replace attendance with invigilation count as an example
                });
            } catch (error) {
                console.error("Error fetching department stats:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, [(user as any)?.institutionId, college?.id, (user as any)?.branchId]);

    const statCards = [
        { label: 'Total Students', value: stats.students, icon: Users, color: 'text-primary', bg: 'bg-primary/10' },
        { label: 'Total Faculty', value: stats.faculty, icon: UserCheck, color: 'text-secondary', bg: 'bg-secondary/10' },
        { label: 'Upcoming Exams', value: stats.exams, icon: ClipboardList, color: 'text-accent', bg: 'bg-accent/10' },
        { label: 'Invigilations', value: stats.invigilations, icon: UserPlus, color: 'text-panel-student', bg: 'bg-panel-student/10' },
    ];

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="dashboard-card h-[104px] flex items-center justify-center">
                        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                ))
            ) : (
                statCards.map((stat, index) => (
                    <div
                        key={stat.label}
                        className="dashboard-card animate-slide-up"
                        style={{ animationDelay: `${index * 100}ms` }}
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground mb-1">{stat.label}</p>
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
