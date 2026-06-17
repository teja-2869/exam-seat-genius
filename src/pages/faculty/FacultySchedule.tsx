import React, { useState, useEffect } from 'react';
import { FacultyLayout } from '@/components/layout/FacultyLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Calendar as CalendarIcon, Clock, MapPin, Users, Activity, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

interface Duty {
  id: string;
  sessionName: string;
  date: string;
  slot: string;
  startTime: string;
  endTime: string;
  roomNumber: string;
  blockNumber: string;
  floorNumber: string | number;
  studentCount: number;
  status: string;
}

export default function FacultySchedule() {
  const { user, college } = useAuth();
  const [duties, setDuties] = useState<Duty[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSchedule = async () => {
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
          where('status', '==', 'upcoming')
        );
        const snap = await getDocs(q);
        const fetched = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
        // Sort chronologically
        fetched.sort((a, b) => a.date.localeCompare(b.date) || a.slot.localeCompare(b.slot));
        setDuties(fetched);
      } catch (err) {
        console.error("Error fetching schedule:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSchedule();
  }, [user, college]);

  return (
    <FacultyLayout>
      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8 animate-fade-in pb-12">
        <div>
          <div className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
            <span>Faculty</span><span>/</span><span className="text-foreground font-medium">Duty Schedule</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground mb-2">
            Your Duty Timetable
          </h1>
          <p className="text-muted-foreground">
            Plan ahead and review all invigilation duties scheduled for this session.
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
                <CalendarIcon className="w-8 h-8" />
              </div>
              <h3 className="font-display font-semibold text-lg text-foreground">No Upcoming Duties</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                You do not have any invigilation duties on your schedule. All clean!
              </p>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {duties.map((duty) => (
              <Card key={duty.id} className="dashboard-card border border-border bg-card shadow-sm hover:border-primary/20 transition-all">
                <CardHeader className="pb-3 border-b">
                  <div className="flex justify-between items-start gap-2">
                    <Badge variant="secondary" className="capitalize text-[10px]">{duty.slot}</Badge>
                    <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 text-[10px]">Upcoming</Badge>
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

                  <div className="flex items-center justify-between bg-muted/30 p-2.5 rounded-lg border text-xs">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <Users className="w-3.5 h-3.5" /> Allocated Cohort
                    </span>
                    <span className="font-bold">{duty.studentCount} Students</span>
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
