import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ClipboardCheck, Clock, Eye, MapPin } from 'lucide-react';

export interface TodayDutyProps {
    hasExamToday: boolean;
    onStartAttendance: () => void;
}

export const FacultyTodayDuty: React.FC<TodayDutyProps> = ({ hasExamToday, onStartAttendance }) => {
    if (!hasExamToday) {
        return (
            <Card className="dashboard-card border-none shadow-sm flex items-center justify-center p-12 bg-card">
                <div className="text-center space-y-4">
                    <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-2 text-muted-foreground/30">
                        <ClipboardCheck className="w-8 h-8" />
                    </div>
                    <h3 className="font-display font-semibold text-lg text-foreground">
                        No Exams Scheduled Today
                    </h3>
                    <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                        You do not have any invigilation duties assigned for today. Enjoy your day!
                    </p>
                </div>
            </Card>
        );
    }

    // Active state
    return (
        <Card className="dashboard-card border border-primary/20 bg-primary/5 shadow-sm overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-bl-full translate-x-8 -translate-y-8" />
            <CardContent className="p-6 sm:p-8 space-y-6">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <span className="px-2.5 py-1 uppercase text-[10px] font-bold tracking-wider text-primary border border-primary/20 bg-primary/10 rounded-full flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                            Active Duty
                        </span>
                    </div>
                    <h2 className="text-2xl font-display font-bold text-foreground">
                        Data Structures - Internal
                    </h2>
                    <p className="text-muted-foreground text-sm font-medium mt-1">CS301 • 45 Students</p>
                </div>

                <div className="flex flex-wrap gap-4 sm:gap-8">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-background flex items-center justify-center border border-border shadow-sm">
                            <MapPin className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Location</p>
                            <p className="font-semibold text-sm">Room 1101, Block 1</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-background flex items-center justify-center border border-border shadow-sm">
                            <Clock className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Time</p>
                            <p className="font-semibold text-sm">10:00 AM - 1:00 PM</p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-primary/10">
                    <Button
                        size="lg"
                        className="w-full sm:w-auto flex-1 font-semibold tracking-wide"
                        onClick={onStartAttendance}
                    >
                        <ClipboardCheck className="w-5 h-5 mr-2" />
                        Start Attendance
                    </Button>
                    <Button variant="outline" size="lg" className="w-full sm:w-auto bg-background/50 backdrop-blur">
                        <Eye className="w-5 h-5 mr-2" />
                        Seating Preview
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
};
