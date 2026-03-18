import React from 'react';
import { Classroom, SeatingPlanLayout } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { User, LogIn, MonitorSpeaker } from 'lucide-react';

interface ClassroomRendererProps {
    layout: Classroom;
    seatingPlan?: SeatingPlanLayout[];
}

export const ClassroomRenderer: React.FC<ClassroomRendererProps> = ({ layout, seatingPlan = [] }) => {
    const { user } = useAuth();
    const isStudent = user?.role === 'student';
    const currentStudentId = user?.id; // Or however roll is checked. We also need to get Student ID. Assuming `user?.id` maps to the `studentId`.

    // Helper to find seat
    const getSeatInfo = (r: number, c: number) => {
        return seatingPlan.find(sp => sp.row === r && sp.column === c);
    };

    const renderSeat = (seatData: { studentId: string; rollNumber: string } | null, isLeft: boolean) => {
        if (!seatData) {
            // Empty Seat
            return (
                <div className={cn(
                    "h-12 w-full flex items-center justify-center rounded-md border-2",
                    isStudent ? "bg-yellow-400/20 border-yellow-400 text-yellow-700" : "bg-gray-100 border-gray-300 text-gray-400"
                )}>
                    <span className="text-[10px] font-semibold">{isStudent ? 'Empty' : 'N/A'}</span>
                </div>
            );
        }

        const unallocated = !seatData;
        const isCurrentStudent = isStudent && seatData.studentId === currentStudentId;
        const isOtherStudent = isStudent && seatData.studentId !== currentStudentId;

        let seatClasses = "";
        let displayText = "";

        if (isStudent && isCurrentStudent) {
            seatClasses = "bg-green-500 border-green-600 text-white shadow-lg animate-pulse-seat";
            displayText = seatData.rollNumber;
        } else if (isStudent && isOtherStudent) {
            seatClasses = "bg-red-500/20 border-red-500 text-red-700";
            displayText = "Assigned"; // Roll number NOT visible
        } else {
            // Admin/HOD/Faculty -> Allocated seat = yellow with Roll No
            seatClasses = "bg-yellow-400 border-yellow-500 text-yellow-900 shadow-sm";
            displayText = seatData.rollNumber;
        }

        return (
            <div className={cn(
                "h-12 w-full flex items-center justify-center rounded-md border-2 transition-all duration-300",
                seatClasses
            )}>
                <span className="text-xs font-bold">{displayText}</span>
            </div>
        );
    };

    const { rows, columns, boardPosition, doorPosition } = layout;

    // We build a flex/grid layout
    // Add padding or absolute elements for Board and Door
    return (
        <div className="relative w-full overflow-x-auto p-4 sm:p-8 lg:p-12 bg-gray-50/50 rounded-2xl border border-gray-200">

            {/* Dynamic Board Placement */}
            {boardPosition === 'top' && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 w-1/3 h-6 bg-slate-800 rounded flex items-center justify-center text-white text-[10px] uppercase font-bold tracking-widest">
                    <MonitorSpeaker className="w-3 h-3 mr-2" /> Board
                </div>
            )}
            {boardPosition === 'bottom' && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-1/3 h-6 bg-slate-800 rounded flex items-center justify-center text-white text-[10px] uppercase font-bold tracking-widest">
                    <MonitorSpeaker className="w-3 h-3 mr-2" /> Board
                </div>
            )}
            {boardPosition === 'left' && (
                <div className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-1/3 bg-slate-800 rounded flex items-center justify-center text-white text-[10px] font-bold" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
                    Board
                </div>
            )}
            {boardPosition === 'right' && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2 w-6 h-1/3 bg-slate-800 rounded flex items-center justify-center text-white text-[10px] font-bold" style={{ writingMode: 'vertical-rl' }}>
                    Board
                </div>
            )}

            {/* Dynamic Door Placement */}
            {doorPosition === 'front' && (
                <div className="absolute top-4 right-12 w-16 h-8 border-4 border-amber-600 border-t-0 rounded-b flex items-center justify-center text-amber-700 text-[10px] font-bold bg-amber-50">
                    <LogIn className="w-4 h-4" />
                </div>
            )}
            {doorPosition === 'back' && (
                <div className="absolute bottom-4 left-12 w-16 h-8 border-4 border-amber-600 border-b-0 rounded-t flex items-center justify-center text-amber-700 text-[10px] font-bold bg-amber-50">
                    <LogIn className="w-4 h-4" />
                </div>
            )}
            {doorPosition === 'left' && (
                <div className="absolute left-4 bottom-12 w-8 h-16 border-4 border-amber-600 border-l-0 rounded-r flex items-center justify-center text-amber-700 text-[10px] font-bold bg-amber-50">
                    <LogIn className="w-4 h-4" />
                </div>
            )}
            {doorPosition === 'right' && (
                <div className="absolute right-4 top-12 w-8 h-16 border-4 border-amber-600 border-r-0 rounded-l flex items-center justify-center text-amber-700 text-[10px] font-bold bg-amber-50">
                    <LogIn className="w-4 h-4" />
                </div>
            )}

            {/* Bench Grid */}
            <div
                className="grid gap-6 mx-auto w-fit"
                style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
            >
                {Array.from({ length: rows }).map((_, rIndex) => (
                    Array.from({ length: columns }).map((_, cIndex) => {
                        const seatInfo = getSeatInfo(rIndex, cIndex);

                        return (
                            <div key={`bench-${rIndex}-${cIndex}`} className="flex flex-col bg-white p-2 rounded-xl border border-gray-200 shadow-sm w-28 sm:w-36 gap-2">
                                <div className="w-full h-4 bg-gray-200 rounded-sm mb-1"></div> {/* Desk visual representation */}
                                <div className="flex gap-2">
                                    <div className="flex-1">{renderSeat(seatInfo?.leftSeat || null, true)}</div>
                                    <div className="flex-1">{renderSeat(seatInfo?.rightSeat || null, false)}</div>
                                </div>
                            </div>
                        );
                    })
                ))}
            </div>

        </div>
    );
};
