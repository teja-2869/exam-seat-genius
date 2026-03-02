import React, { useEffect, useState } from 'react';
import { StudentLayout } from '@/components/layout/StudentLayout';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin, Calendar, Clock, Building2, BookOpen, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';

// Generate mock seating grid dynamically for structural representation
const generateSeatingGrid = (rows: number, cols: number, currentSeat: { row: number; col: number }) => {
    const grid: ('empty' | 'occupied' | 'current')[][] = [];

    for (let r = 0; r < rows; r++) {
        const row: ('empty' | 'occupied' | 'current')[] = [];
        for (let c = 0; c < cols; c++) {
            if (r === currentSeat.row && c === currentSeat.col) {
                row.push('current');
            } else if (Math.random() > 0.4) {
                row.push('occupied');
            } else {
                row.push('empty');
            }
        }
        grid.push(row);
    }

    return grid;
};

export const StudentSeatView: React.FC = () => {
    const { user, college } = useAuth();
    const [loading, setLoading] = useState(true);

    // Hardcoded for operational demo; replaces real fetched data constraints
    const seatInfo = {
        block: 'Block 1',
        floor: 1,
        roomNumber: '1101',
        seatNumber: 'R3-B4',
        row: 2,
        column: 3,
        examDate: 'Jan 15, 2025',
        examTime: '10:00 AM - 1:00 PM',
        subject: 'CS301 - Data Structures',
    };

    const seatingGrid = generateSeatingGrid(5, 8, { row: seatInfo.row, col: seatInfo.column });

    useEffect(() => {
        const fetchSeat = async () => {
            // In a real application, fetch from 'seatingPlans' using:
            // where('institutionId', '==', college.id)
            // where('studentId', '==', user.uid)
            setLoading(false);
        };
        fetchSeat();
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
                        <span>Exams</span>
                        <span>/</span>
                        <span className="text-foreground font-medium">Seat View</span>
                    </div>
                    <h1 className="text-3xl font-display font-bold text-foreground mb-2">
                        Seating Arrangement
                    </h1>
                    <p className="text-muted-foreground flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-primary" /> Please arrive 15 minutes before the reporting time.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* Seat Details Sidebar */}
                    <div className="lg:col-span-1 space-y-4 animate-slide-up stagger-1">
                        <Card className="dashboard-card border-none shadow-sm">
                            <CardContent className="p-6">
                                <h3 className="font-display font-semibold text-lg mb-6 border-b border-border pb-3">Seat Information</h3>

                                <div className="space-y-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-panel-student/10 flex items-center justify-center shrink-0">
                                            <span className="font-bold text-panel-student">#{seatInfo.row + 1}-{seatInfo.column + 1}</span>
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Seat Number</p>
                                            <p className="font-semibold text-foreground text-sm">{seatInfo.seatNumber}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                                            <Building2 className="w-5 h-5 text-muted-foreground" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Location</p>
                                            <p className="font-semibold text-foreground text-sm">{seatInfo.block} • Room {seatInfo.roomNumber}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                                            <Clock className="w-5 h-5 text-muted-foreground" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Time</p>
                                            <p className="font-semibold text-foreground text-sm">{seatInfo.examTime}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                                            <BookOpen className="w-5 h-5 text-muted-foreground" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Subject</p>
                                            <p className="font-semibold text-foreground text-sm">{seatInfo.subject}</p>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="dashboard-card border-none shadow-sm">
                            <CardContent className="p-6">
                                <h3 className="font-display font-semibold text-lg mb-4">Legend</h3>
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-panel-student text-white flex items-center justify-center text-xs font-bold border border-panel-student/20 shadow-sm ring-2 ring-panel-student/40">You</div>
                                        <span className="text-sm font-medium text-muted-foreground">Your Assigned Seat</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-muted border border-border flex items-center justify-center"></div>
                                        <span className="text-sm font-medium text-muted-foreground">Other Students</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg border-2 border-dashed border-border flex items-center justify-center"></div>
                                        <span className="text-sm font-medium text-muted-foreground">Empty Desk</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Visual Classroom Layout */}
                    <div className="lg:col-span-2 animate-slide-up stagger-2">
                        <Card className="dashboard-card border-none shadow-sm bg-card h-full">
                            <CardContent className="p-8">
                                <h3 className="font-display font-semibold text-xl mb-8">Classroom Layout Map</h3>

                                {/* Board */}
                                <div className="w-full h-10 bg-muted-foreground/10 rounded-xl flex items-center justify-center mb-10 border border-border shadow-sm">
                                    <span className="text-muted-foreground text-xs font-bold tracking-[0.2em]">FRONT BOARD</span>
                                </div>

                                {/* Seating Grid */}
                                <div className="overflow-x-auto pb-4 custom-scrollbar">
                                    <div className="flex flex-col gap-4 min-w-fit mx-auto px-4">
                                        {seatingGrid.map((row, rowIndex) => (
                                            <div key={rowIndex} className="flex gap-4 items-center">
                                                <span className="w-6 text-xs text-muted-foreground font-bold tracking-wider">
                                                    R{rowIndex + 1}
                                                </span>
                                                {row.map((seat, colIndex) => (
                                                    <div
                                                        key={`${rowIndex}-${colIndex}`}
                                                        className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center text-xs font-bold transition-transform ${seat === 'current'
                                                                ? 'bg-panel-student text-white shadow-md ring-4 ring-panel-student/30 scale-110 z-10' :
                                                                seat === 'occupied'
                                                                    ? 'bg-muted border border-border/50 text-muted-foreground/0' :
                                                                    'border-2 border-dashed border-border bg-transparent text-transparent'
                                                            }`}
                                                    >
                                                        {seat === 'current' ? 'You' : ''}
                                                    </div>
                                                ))}
                                            </div>
                                        ))}

                                        {/* Columns Label Bottom */}
                                        <div className="flex gap-4 items-center mt-2 border-t border-border/50 pt-4">
                                            <span className="w-6"></span>
                                            {Array.from({ length: 8 }, (_, i) => (
                                                <span key={i} className="w-12 sm:w-14 text-center text-xs text-muted-foreground font-bold tracking-wider">
                                                    C{i + 1}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Door Indicator */}
                                <div className="flex justify-start mt-8">
                                    <div className="flex items-center gap-3 px-4 py-2 bg-muted/50 rounded-lg border border-border">
                                        <div className="w-1 h-6 bg-primary rounded-full"></div>
                                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Entrance Door</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </StudentLayout>
    );
};

export default StudentSeatView;
