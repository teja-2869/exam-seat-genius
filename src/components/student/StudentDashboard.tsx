import React from 'react';
import { StudentLayout } from '@/components/layout/StudentLayout';
import { Card, CardContent } from '@/components/ui/card';
import { GraduationCap, MapPin, Building2, School } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { StudentExamCard, UpcomingExam } from './StudentExamCard';

export const StudentDashboard: React.FC = () => {
    const { user, college } = useAuth();

    // Simulated Upcoming Exam from Firestore query
    const upcomingExam: UpcomingExam = {
        id: 'exam-1',
        name: 'Data Structures - Internal',
        subject: 'CS301',
        date: 'Jan 15, 2025',
        time: '10:00 AM - 1:00 PM',
        block: 'Block 1',
        room: '1101',
        seatNumber: 'R3-B4-L'
    };

    return (
        <StudentLayout>
            <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">

                {/* Breadcrumb & Welcome Section */}
                <div>
                    <div className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
                        <span>Student</span>
                        <span>/</span>
                        <span className="text-foreground font-medium">Dashboard</span>
                    </div>
                    <h1 className="text-3xl font-display font-bold text-foreground mb-2">
                        Welcome, {user?.name || 'Student'}!
                    </h1>
                    <p className="text-muted-foreground">
                        View your upcoming exams and check seating arrangements.
                    </p>
                </div>

                {/* Top Section - Student Info Card */}
                <Card className="dashboard-card border-none shadow-sm animate-slide-up bg-card">
                    <CardContent className="p-6">
                        <div className="flex flex-col md:flex-row md:items-center gap-6">
                            <div className="w-20 h-20 rounded-2xl bg-panel-student/10 flex items-center justify-center shrink-0 border border-panel-student/20">
                                <GraduationCap className="w-10 h-10 text-panel-student" />
                            </div>
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 flex-1">
                                <div>
                                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Student Name</p>
                                    <p className="font-semibold text-lg text-foreground">{user?.name || 'Loading...'}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Roll Number</p>
                                    <p className="font-semibold text-lg text-foreground">{user?.id || 'N/A'}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Branch</p>
                                    <p className="font-semibold text-lg text-foreground">{user?.branchId || 'N/A'}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Institution</p>
                                    <p className="font-semibold text-lg text-foreground">{college?.name || 'N/A'}</p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Middle Section - Upcoming Exam Card */}
                <div className="animate-slide-up stagger-1">
                    <h2 className="text-xl font-display font-bold mb-4 flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-muted-foreground" />
                        Your Next Exam
                    </h2>
                    <StudentExamCard exam={upcomingExam} />
                </div>

            </div>
        </StudentLayout>
    );
};

export default StudentDashboard;
