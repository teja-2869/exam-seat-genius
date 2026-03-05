import React, { useEffect, useState } from 'react';
import { StudentLayout } from '@/components/layout/StudentLayout';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin, Calendar, Clock, Building2, BookOpen, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';

import { ClassroomRenderer } from '@/components/classroom/ClassroomRenderer';
import { Classroom, SeatingPlanLayout } from '@/types';

export const StudentSeatView: React.FC = () => {
    const { user, college } = useAuth();
    const [loading, setLoading] = useState(true);
    const [fetchedLayout, setFetchedLayout] = useState<Classroom | null>(null);
    const [fetchedPlan, setFetchedPlan] = useState<SeatingPlanLayout[]>([]);
    const [seatDetails, setSeatDetails] = useState<any>(null);

    useEffect(() => {
        const fetchSeat = async () => {
            let institutionId = college?.id || (user as any)?.institutionId;
            if (!institutionId || !user?.id) { setLoading(false); return; }

            try {
                // Fetch Seating Plans
                const plansQuery = query(collection(db, 'seatingPlans'), where('institutionId', '==', institutionId), limit(10));
                const planDocs = await getDocs(plansQuery);

                let foundPlan: SeatingPlanLayout[] = [];
                let foundClassroomId = '';
                let foundSeat: any = null;

                for (let doc of planDocs.docs) {
                    const data = doc.data();
                    const plans: SeatingPlanLayout[] = data.seatingPlan || data.plan || [];
                    for (let p of plans) {
                        if (p.leftSeat?.studentId === user.id) {
                            foundPlan = plans; foundClassroomId = data.classroomId; foundSeat = p.leftSeat; break;
                        }
                        if (p.rightSeat?.studentId === user.id) {
                            foundPlan = plans; foundClassroomId = data.classroomId; foundSeat = p.rightSeat; break;
                        }
                    }
                    if (foundClassroomId) break;
                }

                if (foundClassroomId) {
                    setFetchedPlan(foundPlan);
                    const roomQuery = query(collection(db, 'classrooms'), where('institutionId', '==', institutionId), where('roomNumber', '==', foundClassroomId));
                    const roomDocs = await getDocs(roomQuery);
                    if (!roomDocs.empty) {
                        setFetchedLayout(roomDocs.docs[0].data() as Classroom);
                    }
                    setSeatDetails({
                        roomNumber: foundClassroomId,
                        roll: foundSeat.rollNumber,
                        examTime: '10:00 AM - 1:00 PM', // Hardcoded time pending dynamic exam linkage
                        subject: 'Final Examination'
                    });
                }
            } catch (err) {
                console.error("Error fetching seat plan:", err);
            } finally {
                setLoading(false);
            }
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

    if (!fetchedLayout || !seatDetails) {
        return (
            <StudentLayout>
                <div className="flex flex-col h-[60vh] items-center justify-center text-center px-4 space-y-4">
                    <AlertCircle className="w-12 h-12 text-muted-foreground" />
                    <h2 className="text-xl font-display font-semibold">No Seating Allocated</h2>
                    <p className="text-muted-foreground max-w-sm">You have not been assigned a seat for any upcoming examinations yet. Please check back closer to your exam dates.</p>
                </div>
            </StudentLayout>
        )
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
                                            <span className="font-bold text-panel-student">#</span>
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Your Roll No</p>
                                            <p className="font-semibold text-foreground text-sm">{seatDetails.roll}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                                            <Building2 className="w-5 h-5 text-muted-foreground" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Location</p>
                                            <p className="font-semibold text-foreground text-sm">{fetchedLayout.branch || 'Campus'} • Room {seatDetails.roomNumber}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                                            <Clock className="w-5 h-5 text-muted-foreground" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Time</p>
                                            <p className="font-semibold text-foreground text-sm">{seatDetails.examTime}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                                            <BookOpen className="w-5 h-5 text-muted-foreground" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Subject</p>
                                            <p className="font-semibold text-foreground text-sm">{seatDetails.subject}</p>
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
                                        <div className="w-8 h-8 rounded-lg bg-red-500/20 text-red-700 flex items-center justify-center text-[10px] font-bold border border-red-500">Assig.</div>
                                        <span className="text-sm font-medium text-muted-foreground">Other Students</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-yellow-400/20 text-yellow-700 border-yellow-400 flex items-center justify-center text-[10px] font-bold border">Empty</div>
                                        <span className="text-sm font-medium text-muted-foreground">Empty Desk</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Visual Classroom Layout */}
                    <div className="lg:col-span-2 animate-slide-up stagger-2">
                        <Card className="dashboard-card border-none shadow-sm bg-card h-full">
                            <CardContent className="p-0 sm:p-2 overflow-auto">
                                <h3 className="font-display font-semibold text-xl mb-6 p-4">Classroom Structural Map</h3>
                                <ClassroomRenderer layout={fetchedLayout} seatingPlan={fetchedPlan} />
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </StudentLayout>
    );
};

export default StudentSeatView;
