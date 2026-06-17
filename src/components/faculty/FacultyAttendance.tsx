import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CheckCircle2, XCircle, AlertTriangle, Clock, Send, Loader2, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { doc, collection, addDoc, getDoc, getDocs, query, where, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { logAudit } from '@/services/operationsService';
import { Input } from '@/components/ui/input';

export interface FacultyAttendanceProps {
    isOpen: boolean;
    onClose: () => void;
    examId: string; // The invigilation duty document ID
}

interface StudentAttendanceRecord {
    id: string; // rollNumber
    name: string;
    branch: string;
    year: string;
    seat: string; // e.g. R1-C2
    status: 'Present' | 'Absent' | 'Malpractice' | 'Late';
    remarks: string;
}

export const FacultyAttendance: React.FC<FacultyAttendanceProps> = ({ isOpen, onClose, examId }) => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [initializing, setInitializing] = useState(true);
    const [dutyDetails, setDutyDetails] = useState<any | null>(null);
    const [students, setStudents] = useState<StudentAttendanceRecord[]>([]);

    useEffect(() => {
        const fetchStudentsFromSeating = async () => {
            if (!examId) return;
            try {
                setInitializing(true);
                // 1. Fetch Invigilation duty info
                const dutyDoc = await getDoc(doc(db, 'invigilations', examId));
                if (!dutyDoc.exists()) {
                    toast({ title: 'Duty Not Found', description: 'Could not fetch invigilation assignment details.', variant: 'destructive' });
                    setInitializing(false);
                    return;
                }
                const duty = dutyDoc.data();
                setDutyDetails({ id: dutyDoc.id, ...duty });

                // 2. Fetch Seating Plan matching this room and slot
                const plansQuery = query(
                    collection(db, 'seatingPlans'),
                    where('institutionId', '==', duty.institutionId),
                    where('sessionId', '==', duty.sessionId),
                    where('examDate', '==', duty.date),
                    where('examSlot', '==', duty.slot),
                    where('roomNumber', '==', duty.roomNumber)
                );
                const plansSnap = await getDocs(plansQuery);
                if (plansSnap.empty) {
                    toast({ title: 'Seating Plan Missing', description: `No seating plans mapped for Room ${duty.roomNumber} on ${duty.date}.`, variant: 'destructive' });
                    setInitializing(false);
                    return;
                }

                // Get seats array from the plan
                const planData = plansSnap.docs[0].data();
                const seats: any[] = planData.seats || [];

                // 3. Map seats to local Student records
                const mappedStudents: StudentAttendanceRecord[] = seats
                    .filter((s: any) => s.rollNumber)
                    .map((s: any) => ({
                        id: s.rollNumber,
                        name: s.name || 'Unknown Student',
                        branch: s.branch || '',
                        year: s.year || '',
                        seat: `R${s.row}-C${s.column}${s.seatPosition && s.seatPosition !== 'single' ? `-${s.seatPosition[0].toUpperCase()}` : ''}`,
                        status: 'Present',
                        remarks: ''
                    }));

                // Sort students alphabetically/by roll
                mappedStudents.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
                setStudents(mappedStudents);

            } catch (err) {
                console.error("Error loading seating plan for invigilator:", err);
                toast({ title: 'Fetch Error', description: 'Failed to retrieve students roster.', variant: 'destructive' });
            } finally {
                setInitializing(false);
            }
        };

        fetchStudentsFromSeating();
    }, [examId]);

    const handleStatusChange = (studentId: string, status: 'Present' | 'Absent' | 'Malpractice' | 'Late') => {
        setStudents(prev => prev.map(s => s.id === studentId ? { ...s, status } : s));
    };

    const handleRemarksChange = (studentId: string, remarks: string) => {
        setStudents(prev => prev.map(s => s.id === studentId ? { ...s, remarks } : s));
    };

    const submitAttendance = async () => {
        if (!dutyDetails) return;
        setLoading(true);

        const userData = user as any;
        const instId = dutyDetails.institutionId;

        const presentCount = students.filter(s => s.status === 'Present' || s.status === 'Late').length;
        const absentCount = students.filter(s => s.status === 'Absent').length;
        const malpracticeCount = students.filter(s => s.status === 'Malpractice').length;
        const lateCount = students.filter(s => s.status === 'Late').length;

        try {
            // 1. Save Attendance document
            const attendanceData = {
                institutionId: instId,
                facultyId: userData.uid || userData.id || 'faculty',
                facultyName: userData.name || 'Faculty',
                sessionId: dutyDetails.sessionId,
                sessionName: dutyDetails.sessionName,
                date: dutyDetails.date,
                slot: dutyDetails.slot,
                roomNumber: dutyDetails.roomNumber,
                blockNumber: dutyDetails.blockNumber,
                subjectCode: dutyDetails.subjectCode || '',
                subjectName: dutyDetails.subjectName || '',
                records: students.map(s => ({
                    studentId: s.id,
                    rollNumber: s.id,
                    name: s.name,
                    branch: s.branch,
                    year: s.year,
                    status: s.status,
                    remarks: s.remarks
                })),
                presentCount,
                absentCount,
                malpracticeCount,
                lateCount,
                totalStudents: students.length,
                timestamp: serverTimestamp()
            };

            await addDoc(collection(db, 'attendance'), attendanceData);

            // 2. Update Invigilation Duty status
            await updateDoc(doc(db, 'invigilations', dutyDetails.id), {
                status: 'completed',
                attendanceSubmitted: true,
                presentCount,
                absenteeCount: absentCount,
                malpracticeCount,
                lateCount,
                reportSubmitted: true,
                updatedAt: serverTimestamp()
            });

            // 3. Log Audit Trail
            await logAudit(
                userData.uid || userData.id,
                userData.name || 'Faculty',
                'faculty',
                instId,
                'Attendance Submitted',
                `Submitted attendance for Room ${dutyDetails.roomNumber} (Block ${dutyDetails.blockNumber}) on ${dutyDetails.date} (${dutyDetails.slot}). Present: ${presentCount}, Absent: ${absentCount}, Malpractice: ${malpracticeCount}, Late: ${lateCount}.`
            );

            toast({
                title: 'Attendance Sheet Submitted',
                description: `${presentCount} marked present, ${absentCount} absentees, ${malpracticeCount} malpractice cases recorded.`,
            });
            onClose();
        } catch (error: any) {
            console.error("Failed to submit attendance:", error);
            toast({
                title: 'Submission Failed',
                description: error.message || 'Could not communicate with the database.',
                variant: 'destructive'
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-3xl p-0 overflow-hidden gap-0">
                <DialogHeader className="p-6 pb-4 border-b border-border bg-card">
                    <DialogTitle className="text-xl font-display font-bold text-foreground">
                        Classroom Attendance Portal
                    </DialogTitle>
                    <DialogDescription className="mt-1">
                        {dutyDetails ? (
                            <>
                                <span className="font-semibold text-primary">{dutyDetails.sessionName}</span>
                                <span className="mx-2">•</span>
                                <span>Room {dutyDetails.roomNumber} (Block {dutyDetails.blockNumber})</span>
                                <span className="mx-2">•</span>
                                <span>{dutyDetails.date} ({dutyDetails.slot})</span>
                            </>
                        ) : 'Loading duty context...'}
                    </DialogDescription>
                </DialogHeader>

                <div className="max-h-[60vh] overflow-y-auto p-6 bg-muted/10">
                    {initializing ? (
                        <div className="h-64 flex flex-col items-center justify-center gap-3">
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                            <span className="text-sm text-muted-foreground">Retrieving student seat map...</span>
                        </div>
                    ) : students.length === 0 ? (
                        <div className="h-64 flex flex-col items-center justify-center gap-2 border border-dashed rounded-xl bg-card">
                            <FileText className="w-12 h-12 text-muted-foreground opacity-40" />
                            <p className="font-medium text-foreground">No Students Scheduled</p>
                            <p className="text-xs text-muted-foreground">This room has no student allocations in the seating plan.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {students.map((student) => (
                                <div
                                    key={student.id}
                                    className="p-4 rounded-xl bg-card border border-border/50 shadow-sm transition-all hover:border-primary/20 space-y-3"
                                >
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                                                <span className="font-semibold text-primary text-sm uppercase">
                                                    {student.name.split(' ').map(n => n[0]).join('')}
                                                </span>
                                            </div>
                                            <div>
                                                <p className="font-semibold text-sm text-foreground">{student.name}</p>
                                                <p className="text-xs text-muted-foreground font-medium mt-0.5">
                                                    {student.id} <span className="mx-1">•</span> {student.branch} <span className="mx-1">•</span> Seat: <span className="font-mono text-primary font-bold">{student.seat}</span>
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap gap-1.5">
                                            <Button
                                                variant={student.status === 'Present' ? 'default' : 'outline'}
                                                size="sm"
                                                className={`text-xs px-2.5 h-8 font-medium ${student.status === 'Present' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'hover:bg-emerald-50 hover:text-emerald-700'}`}
                                                onClick={() => handleStatusChange(student.id, 'Present')}
                                            >
                                                <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Present
                                            </Button>
                                            <Button
                                                variant={student.status === 'Absent' ? 'default' : 'outline'}
                                                size="sm"
                                                className={`text-xs px-2.5 h-8 font-medium ${student.status === 'Absent' ? 'bg-red-600 hover:bg-red-700 text-white' : 'hover:bg-red-50 hover:text-red-700'}`}
                                                onClick={() => handleStatusChange(student.id, 'Absent')}
                                            >
                                                <XCircle className="w-3.5 h-3.5 mr-1" /> Absent
                                            </Button>
                                            <Button
                                                variant={student.status === 'Late' ? 'default' : 'outline'}
                                                size="sm"
                                                className={`text-xs px-2.5 h-8 font-medium ${student.status === 'Late' ? 'bg-amber-600 hover:bg-amber-700 text-white' : 'hover:bg-amber-50 hover:text-amber-700'}`}
                                                onClick={() => handleStatusChange(student.id, 'Late')}
                                            >
                                                <Clock className="w-3.5 h-3.5 mr-1" /> Late
                                            </Button>
                                            <Button
                                                variant={student.status === 'Malpractice' ? 'default' : 'outline'}
                                                size="sm"
                                                className={`text-xs px-2.5 h-8 font-medium ${student.status === 'Malpractice' ? 'bg-purple-600 hover:bg-purple-700 text-white' : 'hover:bg-purple-50 hover:text-purple-700'}`}
                                                onClick={() => handleStatusChange(student.id, 'Malpractice')}
                                            >
                                                <AlertTriangle className="w-3.5 h-3.5 mr-1" /> Malpractice
                                            </Button>
                                        </div>
                                    </div>
                                    
                                    {(student.status === 'Malpractice' || student.status === 'Late' || student.status === 'Absent') && (
                                        <div className="pt-2 border-t border-dashed">
                                            <Input
                                                placeholder={
                                                    student.status === 'Malpractice' ? 'Specify details (e.g. mobile phone, chits, copying)...' :
                                                    student.status === 'Late' ? 'Reason / arrival time (e.g. 10:15 AM - transport delay)...' :
                                                    'Remarks / details...'
                                                }
                                                className="h-8 text-xs bg-muted/30 focus:bg-white"
                                                value={student.remarks}
                                                onChange={(e) => handleRemarksChange(student.id, e.target.value)}
                                            />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <DialogFooter className="p-6 border-t border-border bg-card">
                    <Button variant="outline" onClick={onClose} disabled={loading}>
                        Cancel
                    </Button>
                    <Button onClick={submitAttendance} disabled={loading || students.length === 0} className="font-semibold tracking-wide">
                        {loading ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                            <Send className="w-4 h-4 mr-2" />
                        )}
                        Submit Attendance & Reports
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
