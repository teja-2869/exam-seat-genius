import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, Clock, MapPin, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export interface UpcomingExam {
    id: string;
    name: string;
    subject: string;
    date: string;
    time: string;
    block: string;
    room: string;
    seatNumber: string;
}

interface StudentExamCardProps {
    exam: UpcomingExam | null;
}

export const StudentExamCard: React.FC<StudentExamCardProps> = ({ exam }) => {
    const navigate = useNavigate();

    if (!exam) {
        return (
            <Card className="dashboard-card border-none shadow-sm flex items-center justify-center p-12 bg-card">
                <div className="text-center space-y-4">
                    <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-2 text-muted-foreground/30">
                        <Search className="w-8 h-8" />
                    </div>
                    <h3 className="font-display font-semibold text-lg text-foreground">
                        No Upcoming Exams
                    </h3>
                    <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                        You do not have any exams scheduled at this time. Relax and keep studying!
                    </p>
                </div>
            </Card>
        );
    }

    return (
        <Card className="dashboard-card border border-panel-student/20 bg-panel-student/5 shadow-sm overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-panel-student/10 rounded-bl-full translate-x-8 -translate-y-8" />
            <CardContent className="p-6 sm:p-8 space-y-6">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <span className="px-2.5 py-1 uppercase text-[10px] font-bold tracking-wider text-panel-student border border-panel-student/20 bg-panel-student/10 rounded-full flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-panel-student animate-pulse" />
                            Next Exam
                        </span>
                    </div>
                    <h2 className="text-2xl font-display font-bold text-foreground">
                        {exam.name}
                    </h2>
                    <p className="text-muted-foreground text-sm font-medium mt-1">{exam.subject}</p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
                    <div className="flex flex-col gap-1">
                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider flex items-center gap-1"><Calendar className="w-3 h-3" /> Date</p>
                        <p className="font-semibold text-sm">{exam.date}</p>
                    </div>
                    <div className="flex flex-col gap-1">
                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider flex items-center gap-1"><Clock className="w-3 h-3" /> Time</p>
                        <p className="font-semibold text-sm">{exam.time}</p>
                    </div>
                    <div className="flex flex-col gap-1">
                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider flex items-center gap-1"><MapPin className="w-3 h-3" /> Location</p>
                        <p className="font-semibold text-sm">{exam.block} - {exam.room}</p>
                    </div>
                    <div className="flex flex-col gap-1">
                        <p className="text-xs text-panel-student font-bold uppercase tracking-wider">Seat Number</p>
                        <p className="font-bold text-xl text-panel-student">{exam.seatNumber}</p>
                    </div>
                </div>

                <div className="pt-4 border-t border-panel-student/10">
                    <Button
                        size="lg"
                        variant="student"
                        className="w-full sm:w-auto font-semibold tracking-wide"
                        onClick={() => navigate('/student/seat-view')}
                    >
                        <MapPin className="w-5 h-5 mr-2" />
                        View Seating Map
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
};
