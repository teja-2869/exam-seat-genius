import React from 'react';
import { Classroom, SeatingPlanLayout } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { User, LogIn, MonitorSpeaker, Briefcase } from 'lucide-react';

interface ClassroomRendererProps {
    layout: Classroom;
    seatingPlan?: SeatingPlanLayout[];
}

export const ClassroomRenderer: React.FC<ClassroomRendererProps> = ({ layout, seatingPlan = [] }) => {
    const { user } = useAuth();
    const isStudent = user?.role === 'student';
    const currentStudentId = user?.id;

    const roomType = (layout.roomType || 'classroom').trim().toLowerCase();
    const rows = layout.rowsOfBenches || layout.rows || 0;
    const columns = layout.columnsOfBenches || layout.columns || 0;
    const { boardPosition, doorPosition, branch } = layout;

    // Room Classifications
    const isHodRoom = roomType === 'hod room' || roomType === 'hod cabin' || roomType === 'hodroom';
    const isFacultyRoom = roomType === 'faculty room' || roomType === 'facultyroom';
    const isLab = roomType === 'lab';
    const isClassroom = roomType === 'classroom';
    const isOther = !isHodRoom && !isFacultyRoom && !isLab && !isClassroom;

    // Helper to find seat
    const getSeatInfo = (r: number, c: number) => {
        return seatingPlan.find(sp => sp.row === r && sp.column === c);
    };

    const renderSeat = (seatData: { studentId: string; rollNumber: string } | null, isLeft: boolean, rIndex: number, cIndex: number, isLabRoom: boolean = false) => {
        const seatId = isLabRoom ? `R${rIndex + 1}-C${cIndex + 1}` : `R${rIndex + 1}-C${cIndex + 1}-${isLeft ? 'L' : 'R'}`;

        if (!seatData) {
            // Empty Seat -> Section 6: Default Styling based on Room Type
            return (
                <div
                    data-seat-id={seatId}
                    className={cn(
                        "w-full flex items-center justify-center rounded-md border-2 transition-colors",
                        isLabRoom
                            ? "h-12 bg-[#bcbcbc] border-[#8b8b8b] hover:bg-[#9ae0ca]"
                            : "h-10 bg-gray-100 border-gray-300 hover:bg-gray-200"
                    )}
                >
                    <div className={cn(
                        "rounded flex items-center justify-center shadow-inner border",
                        isLabRoom ? "w-6 h-6 border-gray-600 bg-[#ffffff]" : "w-5 h-5 border-gray-400 bg-gray-200"
                    )}>
                        {isLabRoom ? (
                            <User className="w-3 h-3 text-gray-500" />
                        ) : (
                            <span className="text-[8px] font-bold text-gray-500">{isLeft ? 'L' : 'R'}</span>
                        )}
                    </div>
                </div>
            );
        }

        const isCurrentStudent = isStudent && seatData.studentId === currentStudentId;
        const isOtherStudent = isStudent && seatData.studentId !== currentStudentId;

        let seatClasses = "";
        let displayText = "";

        if (isStudent && isCurrentStudent) {
            seatClasses = "bg-green-500 border-green-600 text-white shadow-lg animate-pulse-seat";
            displayText = seatData.rollNumber;
        } else if (isStudent && isOtherStudent) {
            seatClasses = "bg-red-500/20 border-red-500 text-red-700";
            displayText = "Assigned";
        } else {
            // Admin/HOD/Faculty -> Allocated seat
            seatClasses = "bg-yellow-400 border-yellow-500 text-yellow-900 shadow-sm";
            displayText = seatData.rollNumber;
        }

        return (
            <div
                data-seat-id={seatId}
                className={cn(
                    "w-full flex items-center justify-center rounded-md border-2 transition-all duration-300",
                    isLabRoom ? "h-12" : "h-10",
                    seatClasses
                )}>
                <span className="text-xs font-bold">{displayText}</span>
            </div>
        );
    };

    return (
        <div className="relative w-full overflow-x-auto p-4 sm:p-8 lg:p-12 bg-gray-50/50 rounded-2xl border border-gray-200 min-h-[400px] flex items-center justify-center">

            {/* Dynamic Board Placement (Only for Classrooms/Labs) */}
            {(isClassroom || isLab) && boardPosition === 'top' && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 w-1/3 h-6 bg-slate-800 rounded flex items-center justify-center text-white text-[10px] uppercase font-bold tracking-widest">
                    <MonitorSpeaker className="w-3 h-3 mr-2" /> Board
                </div>
            )}
            {(isClassroom || isLab) && boardPosition === 'bottom' && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-1/3 h-6 bg-slate-800 rounded flex items-center justify-center text-white text-[10px] uppercase font-bold tracking-widest">
                    <MonitorSpeaker className="w-3 h-3 mr-2" /> Board
                </div>
            )}
            {(isClassroom || isLab) && boardPosition === 'left' && (
                <div className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-1/3 bg-slate-800 rounded flex items-center justify-center text-white text-[10px] font-bold" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
                    Board
                </div>
            )}
            {(isClassroom || isLab) && boardPosition === 'right' && (
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

            {/* HOD ROOM RENDER */}
            {isHodRoom && (
                <div className="w-full max-w-lg h-64 flex flex-col items-center justify-center border-4 border-dashed border-purple-200 rounded-xl bg-purple-50/80 shadow-sm mx-auto">
                    <Briefcase className="w-12 h-12 text-purple-400 mb-4" />
                    <h3 className="text-xl font-bold text-purple-900 uppercase tracking-wider text-center">HOD OF {branch || 'DEPARTMENT'}</h3>
                    <p className="text-sm font-medium text-purple-600 uppercase mt-2">{layout.roomType || 'HOD Cabin'}</p>
                </div>
            )}

            {/* FACULTY ROOM RENDER */}
            {isFacultyRoom && (
                <div className="w-full max-w-lg h-64 flex flex-col items-center justify-center border-4 border-dashed border-rose-200 rounded-xl bg-rose-50/80 shadow-sm mx-auto">
                    <User className="w-12 h-12 text-rose-400 mb-3" />
                    <h3 className="text-xl font-bold text-rose-900 uppercase tracking-wider text-center">Faculty Room</h3>
                    <p className="text-sm font-medium text-rose-600 mt-1">Not applicable for exam seating</p>
                    {/* Visual Desks Representation */}
                    <div className="flex gap-6 mt-6 opacity-60">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="w-16 h-12 bg-rose-200 rounded-md border-2 border-rose-300 shadow-sm"></div>
                        ))}
                    </div>
                </div>
            )}

            {/* OTHER / WASHROOM RENDER */}
            {isOther && (
                <div className="w-full max-w-lg h-64 flex flex-col items-center justify-center border-4 border-dashed border-amber-200 rounded-xl bg-amber-50/80 shadow-sm mx-auto">
                    <h3 className="text-xl font-bold text-amber-900 uppercase tracking-wider text-center bg-white px-4 py-2 rounded shadow-sm border border-amber-100">{layout.roomType}</h3>
                    <p className="text-sm font-semibold text-amber-700 uppercase mt-4">No seating place available in this room</p>
                </div>
            )}

            {/* CLASSROOM & LAB GRID RENDER */}
            {(isClassroom || isLab) && rows > 0 && columns > 0 && (
                <div
                    className={cn(
                        "grid gap-6 mx-auto w-fit z-10",
                        boardPosition === 'top' ? 'mt-12' : boardPosition === 'bottom' ? 'mb-12' : 'my-8'
                    )}
                    style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
                >
                    {Array.from({ length: rows }).map((_, rIndex) => (
                        Array.from({ length: columns }).map((_, cIndex) => {
                            const seatInfo = getSeatInfo(rIndex, cIndex);

                            return (
                                <div
                                    key={`bench-${rIndex}-${cIndex}`}
                                    className={cn(
                                        "flex flex-col bg-gray-50 border shadow-sm transition-all",
                                        isLab ? "rounded-lg border-emerald-300 w-28 sm:w-32 pt-4 p-2 bg-emerald-50/30" : "rounded-xl border-gray-300 w-28 sm:w-36 p-2 gap-2"
                                    )}
                                >
                                    {/* Desk/Table visual representation */}
                                    <div className={cn(
                                        "w-full rounded-sm shadow-inner flex items-center justify-center",
                                        isLab ? "h-6 mb-3 bg-emerald-200/50 border border-emerald-300" : "h-5 mb-1 bg-gray-300 border border-gray-400"
                                    )}>
                                        {isLab && <MonitorSpeaker className="w-4 h-4 text-emerald-600/50" />}
                                    </div>

                                    {/* Seats mapping */}
                                    <div className="flex gap-2 justify-center">
                                        {isLab ? (
                                            <div className="flex-1 max-w-[80px]">
                                                {renderSeat(seatInfo?.leftSeat || null, true, rIndex, cIndex, true)}
                                            </div>
                                        ) : (
                                            <>
                                                <div className="flex-1">{renderSeat(seatInfo?.leftSeat || null, true, rIndex, cIndex, false)}</div>
                                                <div className="flex-1">{renderSeat(seatInfo?.rightSeat || null, false, rIndex, cIndex, false)}</div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    ))}
                </div>
            )}
        </div>
    );
};
