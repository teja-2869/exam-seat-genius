import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { FacultyLayout } from '@/components/layout/FacultyLayout';
import { ClipboardCheck, Activity, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { toast } from 'sonner';

export default function FacultyAttendancePage() {
    const { user } = useAuth();
    const [exams, setExams] = useState<any[]>([]);
    const [students, setStudents] = useState<any[]>([]);
    const [selectedExam, setSelectedExam] = useState('');
    const [attendance, setAttendance] = useState<Record<string, 'present' | 'absent'>>({});
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        const fetch = async () => {
            const institutionId = (user as any)?.collegeId || (user as any)?.institutionId;
            if (!institutionId) { setLoading(false); return; }
            try {
                const [eSnap, sSnap] = await Promise.all([
                    getDocs(query(collection(db, 'exams'), where('institutionId', '==', institutionId))),
                    getDocs(query(collection(db, 'students'), where('institutionId', '==', institutionId)))
                ]);
                setExams(eSnap.docs.map(d => ({ id: d.id, ...d.data() })));
                setStudents(sSnap.docs.map(d => ({ id: d.id, ...d.data() })));
            } catch (err) { console.error(err); }
            setLoading(false);
        };
        fetch();
    }, [user]);

    const toggleAttendance = (studentId: string) => {
        setAttendance(prev => ({
            ...prev,
            [studentId]: prev[studentId] === 'present' ? 'absent' : 'present'
        }));
    };

    const handleSubmit = async () => {
        if (!selectedExam) { toast.error('Select an exam first'); return; }
        const institutionId = (user as any)?.collegeId || (user as any)?.institutionId;
        setSubmitting(true);
        try {
            for (const [studentId, status] of Object.entries(attendance)) {
                await addDoc(collection(db, 'attendance'), {
                    institutionId,
                    examId: selectedExam,
                    studentId,
                    status,
                    markedBy: user?.id || '',
                    createdAt: serverTimestamp()
                });
            }
            toast.success(`Attendance submitted for ${Object.keys(attendance).length} students`);
            setAttendance({});
        } catch (err) { console.error(err); toast.error('Failed to submit'); }
        setSubmitting(false);
    };

    return (
        <FacultyLayout>
            <div className="max-w-7xl mx-auto space-y-8 animate-fade-in pb-12">
                <div>
                    <div className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
                        <span>Faculty</span><span>/</span><span>Operations</span><span>/</span><span className="text-foreground font-medium">Attendance</span>
                    </div>
                    <h1 className="text-3xl font-display font-bold text-foreground mb-2">Mark Attendance</h1>
                    <p className="text-muted-foreground">Mark student attendance for your assigned exam.</p>
                </div>

                <div className="flex gap-4 items-end">
                    <div className="space-y-2 flex-1 max-w-sm">
                        <Select value={selectedExam} onValueChange={setSelectedExam}>
                            <SelectTrigger><SelectValue placeholder="Select exam" /></SelectTrigger>
                            <SelectContent>
                                {exams.map(e => <SelectItem key={e.id} value={e.id}>{e.name} - {e.subjectCode}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <Button onClick={handleSubmit} disabled={submitting || !Object.keys(attendance).length}>
                        {submitting ? <Activity className="w-4 h-4 mr-2 animate-spin" /> : <ClipboardCheck className="w-4 h-4 mr-2" />}
                        Submit Attendance ({Object.keys(attendance).length})
                    </Button>
                </div>

                {loading ? (
                    <div className="h-64 flex items-center justify-center border rounded-xl"><Activity className="animate-spin text-primary w-8 h-8" /></div>
                ) : students.length === 0 ? (
                    <div className="h-64 flex flex-col items-center justify-center border rounded-xl text-muted-foreground bg-muted/20">
                        <ClipboardCheck className="w-12 h-12 mb-4 opacity-50" />
                        <p>No students found.</p>
                    </div>
                ) : (
                    <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-muted/50 text-muted-foreground font-semibold border-b">
                                <tr>
                                    <th className="px-6 py-4">Roll No</th>
                                    <th className="px-6 py-4">Name</th>
                                    <th className="px-6 py-4">Branch</th>
                                    <th className="px-6 py-4 text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {students.map(s => (
                                    <tr key={s.id} className="hover:bg-muted/20 cursor-pointer" onClick={() => toggleAttendance(s.id)}>
                                        <td className="px-6 py-4 font-bold">{s.rollNumber || s.id.slice(0, 8)}</td>
                                        <td className="px-6 py-4">{s.name}</td>
                                        <td className="px-6 py-4 text-muted-foreground">{s.branch || 'N/A'}</td>
                                        <td className="px-6 py-4 text-center">
                                            {attendance[s.id] === 'present' ? (
                                                <CheckCircle className="w-5 h-5 text-green-500 mx-auto" />
                                            ) : attendance[s.id] === 'absent' ? (
                                                <XCircle className="w-5 h-5 text-destructive mx-auto" />
                                            ) : (
                                                <span className="text-muted-foreground text-xs">Tap to mark</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </FacultyLayout>
    );
}
