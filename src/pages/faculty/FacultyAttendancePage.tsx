import React, { useState, useEffect } from 'react';
import { FacultyLayout } from '@/components/layout/FacultyLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ClipboardCheck, MapPin, Calendar, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { FacultyAttendance } from '@/components/faculty/FacultyAttendance';

export default function FacultyAttendancePage() {
  const { user, college } = useAuth();
  const casted = user as any;
  const institutionId = casted?.institutionId || casted?.collegeId || college?.id || '';
  const uid = casted?.uid || casted?.id;

  const [duties, setDuties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDuty, setOpenDuty] = useState<string | null>(null);

  const load = async () => {
    if (!institutionId || !uid) { setLoading(false); return; }
    try {
      setLoading(true);
      const snap = await getDocs(query(collection(db, 'invigilations'),
        where('institutionId', '==', institutionId), where('assignedFacultyId', '==', uid)));
      const rows = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      rows.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
      setDuties(rows);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [institutionId, uid]);

  return (
    <FacultyLayout>
      <div className="max-w-6xl mx-auto space-y-6 animate-fade-in pb-12">
        <div>
          <div className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
            <span>Faculty</span><span>/</span><span>Operations</span><span>/</span><span className="text-foreground font-medium">Attendance</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground mb-1">Mark Examination Attendance</h1>
          <p className="text-muted-foreground text-sm">Select an assigned invigilation duty to record student attendance.</p>
        </div>

        {loading ? (
          <div className="grid gap-3 md:grid-cols-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32" />)}</div>
        ) : duties.length === 0 ? (
          <Card className="border-dashed"><CardContent className="p-12 text-center space-y-3">
            <ClipboardCheck className="w-12 h-12 mx-auto text-muted-foreground/40" />
            <p className="font-medium text-foreground">No Assigned Duties</p>
            <p className="text-sm text-muted-foreground">You have no invigilation assignments yet.</p>
          </CardContent></Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {duties.map(d => {
              const submitted = d.attendanceSubmitted || d.status === 'completed';
              return (
                <Card key={d.id} className="border-none shadow-sm">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start gap-2">
                      <CardTitle className="text-base">{d.sessionName || 'Examination'}</CardTitle>
                      <Badge className={submitted ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}>
                        {submitted ? 'Submitted' : 'Pending'}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{d.subjectCode} — {d.subjectName}</p>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="text-sm flex items-center gap-2"><Calendar className="w-3.5 h-3.5 text-muted-foreground" /> {d.date} <Badge variant="outline" className="text-[10px]">{d.slot}</Badge></div>
                    <div className="text-sm flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-muted-foreground" /> Room {d.roomNumber} · Block {d.blockNumber}</div>
                    <Button size="sm" className="w-full mt-2" variant={submitted ? 'outline' : 'default'} onClick={() => setOpenDuty(d.id)}>
                      {submitted ? <><CheckCircle2 className="w-4 h-4 mr-1.5" />View / Resubmit</> : <><ClipboardCheck className="w-4 h-4 mr-1.5" />Mark Attendance</>}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {openDuty && (
        <FacultyAttendance
          isOpen={!!openDuty}
          onClose={() => { setOpenDuty(null); load(); }}
          examId={openDuty}
        />
      )}
    </FacultyLayout>
  );
}
