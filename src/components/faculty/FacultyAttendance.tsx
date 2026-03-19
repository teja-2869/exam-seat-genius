import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CheckCircle2, XCircle, Send, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { doc, collection, addDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { auth } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';

export interface FacultyAttendanceProps {
    isOpen: boolean;
    onClose: () => void;
    examId: string;
}

const mockStudents = [
    { id: '24BFA33001', name: 'John Doe', seat: 'A1-01', present: true },
    { id: '24BFA33002', name: 'Jane Smith', seat: 'A1-02', present: true },
    { id: '24BFA33003', name: 'Mike Johnson', seat: 'A1-03', present: false },
    { id: '24BFA33004', name: 'Sarah Williams', seat: 'A1-04', present: true },
    { id: '24BFA33005', name: 'David Brown', seat: 'A2-01', present: true },
    { id: '24BFA33006', name: 'Emily Davis', seat: 'A2-02', present: false },
];

export const FacultyAttendance: React.FC<FacultyAttendanceProps> = ({ isOpen, onClose, examId }) => {
    const { user, college } = useAuth();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [attendance, setAttendance] = useState<Record<string, boolean>>(() => {
        const initial: Record<string, boolean> = {};
        mockStudents.forEach(s => { initial[s.id] = s.present; });
        return initial;
    });

    const toggleAttendance = (studentId: string) => {
        setAttendance(prev => ({ ...prev, [studentId]: !prev[studentId] }));
    };

        const submitAttendance = async () => {
        if (!auth.currentUser) {
            toast({ title: 'Auth Error', description: 'Not signed in', variant: 'destructive' });
            return;
        }
        setLoading(true);
        try {
            const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
            if (!userDoc.exists()) {
                toast({ title: 'Session Error', description: 'User data not found.', variant: 'destructive' });
                setLoading(false);
                return;
            }
            const currentUser = userDoc.data();
            if (!currentUser.institutionId) {
                alert("Error: Critical verification failed - institutionId is missing for the active user instance.");
                setLoading(false);
                return;
            }

            console.log("Writing with institutionId:", currentUser.institutionId);

            const attendanceData = {
                institutionId: currentUser.institutionId,
                facultyId: auth.currentUser.uid,
                examId: examId,
                timestamp: serverTimestamp(),
                records: Object.entries(attendance).map(([studentId, isPresent]) => ({
                    studentId,
                    isPresent,
                }))
            };

            await addDoc(collection(db, 'attendance'), attendanceData);

            const presentCount = Object.values(attendance).filter(Boolean).length;

            setTimeout(() => {
                toast({
                    title: 'Attendance Submitted Successfully',
                    description: `${presentCount}/${mockStudents.length} students marked present. Record saved.`,
                });
                setLoading(false);
                onClose();
            }, 1000);

        } catch (error) {
            console.error(error);
            toast({
                title: 'Error Submitting',
                description: 'Could not communicate with the server.',
                variant: 'destructive'
            });
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-2xl p-0 overflow-hidden gap-0">
                <DialogHeader className="p-6 pb-4 border-b border-border bg-card">
                    <DialogTitle className="text-xl font-display font-bold text-foreground">
                        Mark Attendance
                    </DialogTitle>
                    <DialogDescription>
                        <span className="font-semibold text-primary">Data Structures - Internal</span> • CS301
                    </DialogDescription>
                </DialogHeader>

                <div className="max-h-[50vh] overflow-y-auto p-6 bg-muted/10">
                    <div className="space-y-3">
                        {mockStudents.map((student) => (
                            <div
                                key={student.id}
                                className="flex items-center justify-between p-4 rounded-xl bg-card border border-border/50 shadow-sm transition-colors hover:border-primary/20"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                                        <span className="font-semibold text-primary text-sm uppercase">
                                            {student.name.split(' ').map(n => n[0]).join('')}
                                        </span>
                                    </div>
                                    <div>
                                        <p className="font-semibold text-sm text-foreground">{student.name}</p>
                                        <p className="text-xs text-muted-foreground font-medium mt-0.5">
                                            {student.id} <span className="mx-1">•</span> Seat: {student.seat}
                                        </p>
                                    </div>
                                </div>
                                <Button
                                    variant={attendance[student.id] ? 'secondary' : 'destructive'}
                                    size="sm"
                                    className={attendance[student.id] ? 'bg-secondary/10 text-secondary hover:bg-secondary/20' : 'bg-destructive/10 text-destructive hover:bg-destructive/20'}
                                    onClick={() => toggleAttendance(student.id)}
                                >
                                    {attendance[student.id] ? (
                                        <>
                                            <CheckCircle2 className="w-4 h-4 mr-1.5" /> Present
                                        </>
                                    ) : (
                                        <>
                                            <XCircle className="w-4 h-4 mr-1.5" /> Absent
                                        </>
                                    )}
                                </Button>
                            </div>
                        ))}
                    </div>
                </div>

                <DialogFooter className="p-6 border-t border-border bg-card">
                    <Button variant="outline" onClick={onClose} disabled={loading}>
                        Cancel
                    </Button>
                    <Button onClick={submitAttendance} disabled={loading}>
                        {loading ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                            <Send className="w-4 h-4 mr-2" />
                        )}
                        Submit Attendance
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
