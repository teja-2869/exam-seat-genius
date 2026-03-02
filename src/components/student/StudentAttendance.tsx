import React, { useEffect, useState } from 'react';
import { StudentLayout } from '@/components/layout/StudentLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, ClipboardCheck, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

interface AttendanceRecord {
    id: string;
    examName: string;
    date: string;
    status: 'present' | 'absent';
}

export const StudentAttendance: React.FC = () => {
    const { user, college } = useAuth();
    const [records, setRecords] = useState<AttendanceRecord[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAttendance = async () => {
            // Hardcoded for demo; logically reflects actual query:
            // where('institutionId', '==', college.id)
            // where('studentId', '==', user.uid)

            const mockRecords: AttendanceRecord[] = [
                { id: '1', examName: 'Data Structures - Internal', date: 'Jan 15, 2025', status: 'present' },
                { id: '2', examName: 'Operating Systems - Internal', date: 'Dec 10, 2024', status: 'absent' },
                { id: '3', examName: 'Computer Networks - Internal', date: 'Nov 05, 2024', status: 'present' },
            ];

            setRecords(mockRecords);
            setLoading(false);
        };

        fetchAttendance();
    }, [user, college]);

    if (loading) {
        return (
            <StudentLayout>
                <div className="flex h-[60vh] items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-panel-student" />
                </div>
            </StudentLayout>
        );
    }

    return (
        <StudentLayout>
            <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">

                {/* Header */}
                <div>
                    <div className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
                        <span>Student</span>
                        <span>/</span>
                        <span className="text-foreground font-medium">Attendance</span>
                    </div>
                    <h1 className="text-3xl font-display font-bold text-foreground mb-2">
                        Attendance Record
                    </h1>
                    <p className="text-muted-foreground flex items-center gap-2">
                        View your exam attendance history.
                    </p>
                </div>

                <Card className="dashboard-card border-none shadow-sm animate-slide-up">
                    <CardContent className="p-0 sm:p-6">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-[600px]">
                                <thead>
                                    <tr className="border-b border-border/50 bg-muted/30">
                                        <th className="py-4 px-6 text-sm font-semibold text-muted-foreground tracking-wider uppercase">Exam Name</th>
                                        <th className="py-4 px-6 text-sm font-semibold text-muted-foreground tracking-wider uppercase">Date</th>
                                        <th className="py-4 px-6 text-sm font-semibold text-muted-foreground tracking-wider uppercase">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/50">
                                    {records.map((record) => (
                                        <tr key={record.id} className="hover:bg-muted/10 transition-colors">
                                            <td className="py-4 px-6">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${record.status === 'present' ? 'bg-panel-student/10' : 'bg-destructive/10'
                                                        }`}>
                                                        <ClipboardCheck className={`w-5 h-5 ${record.status === 'present' ? 'text-panel-student' : 'text-destructive'
                                                            }`} />
                                                    </div>
                                                    <span className="font-semibold text-foreground text-sm">{record.examName}</span>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6">
                                                <div className="flex items-center gap-2 font-medium text-sm text-muted-foreground">
                                                    <Calendar className="w-4 h-4" />
                                                    {record.date}
                                                </div>
                                            </td>
                                            <td className="py-4 px-6">
                                                {record.status === 'present' ? (
                                                    <Badge variant="outline" className="bg-panel-student/10 text-panel-student border-panel-student/20 tracking-wider">
                                                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> PRESENT
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 tracking-wider">
                                                        <AlertTriangle className="w-3.5 h-3.5 mr-1" /> ABSENT
                                                    </Badge>
                                                )}

                                                {record.status === 'absent' && (
                                                    <p className="text-xs text-muted-foreground mt-2 font-medium flex gap-1.5 items-start">
                                                        <AlertTriangle className="w-3 h-3 text-destructive shrink-0 mt-0.5" />
                                                        <span className="max-w-[180px]">Please contact your HOD immediately regarding this absence.</span>
                                                    </p>
                                                )}
                                            </td>
                                        </tr>
                                    ))}

                                    {records.length === 0 && (
                                        <tr>
                                            <td colSpan={3} className="py-12 text-center text-muted-foreground text-sm font-medium">
                                                No attendance records found yet.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>

            </div>
        </StudentLayout>
    );
};

export default StudentAttendance;
