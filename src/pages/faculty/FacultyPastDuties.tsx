import React, { useState, useEffect } from 'react';
import { FacultyLayout } from '@/components/layout/FacultyLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Calendar, CheckCircle2, Clock, MapPin, Users, Activity, AlertTriangle, FileSpreadsheet } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

interface CompletedDuty {
  id: string;
  sessionName: string;
  date: string;
  slot: string;
  startTime: string;
  endTime: string;
  roomNumber: string;
  blockNumber: string;
  studentCount: number;
  presentCount: number;
  absenteeCount: number;
  malpracticeCount: number;
}

export default function FacultyPastDuties() {
  const { user, college } = useAuth();
  const [duties, setDuties] = useState<CompletedDuty[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPastDuties = async () => {
      const castedUser = user as any;
      const collId = castedUser?.institutionId || castedUser?.collegeId || college?.id;
      const uid = castedUser?.uid || castedUser?.id;

      if (!uid || !collId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const q = query(
          collection(db, 'invigilations'),
          where('institutionId', '==', collId),
          where('assignedFacultyId', '==', uid),
          where('status', '==', 'completed')
        );
        const snap = await getDocs(q);
        const fetched = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
        // Sort chronologically descending (latest completed first)
        fetched.sort((a, b) => b.date.localeCompare(a.date) || b.slot.localeCompare(a.slot));
        setDuties(fetched);
      } catch (err) {
        console.error("Error fetching past duties:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPastDuties();
  }, [user, college]);

  return (
    <FacultyLayout>
      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8 animate-fade-in pb-12">
        <div>
          <div className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
            <span>Faculty</span><span>/</span><span className="text-foreground font-medium">Past Duties</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground mb-2">
            Invigilation History
          </h1>
          <p className="text-muted-foreground">
            Logs of your completed examination duties and submissions.
          </p>
        </div>

        {loading ? (
          <div className="h-64 flex items-center justify-center border border-dashed rounded-xl bg-card">
            <Activity className="animate-spin text-primary w-8 h-8" />
          </div>
        ) : duties.length === 0 ? (
          <Card className="border-none shadow-sm flex items-center justify-center p-12 bg-card">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-2 text-muted-foreground/30">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="font-display font-semibold text-lg text-foreground">No Completed Duties</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                No past invigilation duty records found. Submit attendance on an active duty to record history.
              </p>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {duties.map((duty) => (
              <Card key={duty.id} className="dashboard-card border border-border bg-card shadow-sm hover:border-primary/10 transition-all">
                <CardHeader className="pb-3 border-b">
                  <div className="flex justify-between items-start gap-2">
                    <Badge variant="outline" className="capitalize text-[10px]">{duty.slot}</Badge>
                    <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 text-[10px]">Completed</Badge>
                  </div>
                  <CardTitle className="text-lg font-bold mt-2 truncate">{duty.sessionName}</CardTitle>
                  <CardDescription className="text-xs font-semibold text-primary">{duty.date}</CardDescription>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div className="flex items-center gap-2.5">
                      <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                      <div>
                        <p className="text-muted-foreground font-medium uppercase tracking-wider text-[9px]">Location</p>
                        <p className="font-bold">Room {duty.roomNumber}</p>
                        <p className="text-[10px] text-muted-foreground">Block {duty.blockNumber}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
                      <div>
                        <p className="text-muted-foreground font-medium uppercase tracking-wider text-[9px]">Timing</p>
                        <p className="font-bold">{duty.startTime}</p>
                        <p className="text-[10px] text-muted-foreground">to {duty.endTime}</p>
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-3 space-y-2 text-xs">
                    <p className="text-muted-foreground font-medium uppercase tracking-wider text-[9px]">Attendance Metrics</p>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-emerald-50/50 border border-emerald-100 p-2 text-center rounded-lg">
                        <p className="text-muted-foreground text-[10px]">Present</p>
                        <p className="font-bold text-emerald-700 text-sm">{duty.presentCount}</p>
                      </div>
                      <div className="bg-red-50/50 border border-red-100 p-2 text-center rounded-lg">
                        <p className="text-muted-foreground text-[10px]">Absent</p>
                        <p className="font-bold text-red-700 text-sm">{duty.absenteeCount}</p>
                      </div>
                      <div className="bg-purple-50/50 border border-purple-100 p-2 text-center rounded-lg">
                        <p className="text-muted-foreground text-[10px]">Malpractice</p>
                        <p className="font-bold text-purple-700 text-sm">{duty.malpracticeCount || 0}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </FacultyLayout>
  );
}
