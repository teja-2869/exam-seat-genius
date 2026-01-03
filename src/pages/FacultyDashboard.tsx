import React, { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { useAuth } from '@/contexts/AuthContext';
import { 
  ClipboardList, 
  Calendar,
  MapPin,
  Clock,
  Users,
  CheckCircle2,
  XCircle,
  Eye,
  Send
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

const invigilationDuties = [
  {
    id: 1,
    exam: 'Data Structures - Internal',
    subject: 'CS301',
    date: 'Jan 15, 2025',
    time: '10:00 AM - 1:00 PM',
    room: 'Room 101',
    block: 'A',
    students: 45,
    status: 'upcoming'
  },
  {
    id: 2,
    exam: 'Database Management - External',
    subject: 'CS302',
    date: 'Jan 18, 2025',
    time: '2:00 PM - 5:00 PM',
    room: 'Room 205',
    block: 'B',
    students: 52,
    status: 'upcoming'
  },
  {
    id: 3,
    exam: 'Computer Networks - Internal',
    subject: 'CS304',
    date: 'Jan 12, 2025',
    time: '10:00 AM - 1:00 PM',
    room: 'Room 103',
    block: 'A',
    students: 48,
    status: 'completed'
  }
];

const demoStudents = [
  { id: '24BFA33001', name: 'John Doe', seat: 'A1-01', present: true },
  { id: '24BFA33002', name: 'Jane Smith', seat: 'A1-02', present: true },
  { id: '24BFA33003', name: 'Mike Johnson', seat: 'A1-03', present: false },
  { id: '24BFA33004', name: 'Sarah Williams', seat: 'A1-04', present: true },
  { id: '24BFA33005', name: 'David Brown', seat: 'A2-01', present: true },
  { id: '24BFA33006', name: 'Emily Davis', seat: 'A2-02', present: false },
];

const FacultyDashboard: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedDuty, setSelectedDuty] = useState<number | null>(null);
  const [attendance, setAttendance] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    demoStudents.forEach(s => { initial[s.id] = s.present; });
    return initial;
  });

  const toggleAttendance = (studentId: string) => {
    setAttendance(prev => ({ ...prev, [studentId]: !prev[studentId] }));
  };

  const submitAttendance = () => {
    const presentCount = Object.values(attendance).filter(Boolean).length;
    toast({
      title: 'Attendance Submitted',
      description: `${presentCount}/${demoStudents.length} students marked present.`,
    });
    setSelectedDuty(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-24 pb-12 px-6">
        <div className="max-w-6xl mx-auto">
          {/* Welcome Section */}
          <div className="mb-8 animate-fade-in">
            <h1 className="text-3xl font-display font-bold text-foreground mb-2">
              Faculty Dashboard
            </h1>
            <p className="text-muted-foreground">
              View your invigilation duties and manage attendance
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
            <div className="dashboard-card animate-slide-up">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Upcoming Duties</p>
                  <p className="text-3xl font-display font-bold text-foreground">
                    {invigilationDuties.filter(d => d.status === 'upcoming').length}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-accent" />
                </div>
              </div>
            </div>

            <div className="dashboard-card animate-slide-up stagger-1">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Completed</p>
                  <p className="text-3xl font-display font-bold text-foreground">
                    {invigilationDuties.filter(d => d.status === 'completed').length}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-secondary" />
                </div>
              </div>
            </div>

            <div className="dashboard-card animate-slide-up stagger-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Total Students</p>
                  <p className="text-3xl font-display font-bold text-foreground">
                    {invigilationDuties.reduce((sum, d) => sum + d.students, 0)}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Users className="w-6 h-6 text-primary" />
                </div>
              </div>
            </div>
          </div>

          {/* Invigilation Duties */}
          <div className="dashboard-card animate-slide-up stagger-3">
            <h2 className="text-xl font-display font-bold text-foreground mb-6">
              Invigilation Duties
            </h2>

            <div className="space-y-4">
              {invigilationDuties.map((duty) => (
                <div
                  key={duty.id}
                  className={`p-6 rounded-xl border transition-all ${
                    duty.status === 'completed'
                      ? 'bg-muted/30 border-border'
                      : 'bg-card border-border hover:border-accent'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        duty.status === 'completed' ? 'bg-secondary/10' : 'bg-accent/10'
                      }`}>
                        <ClipboardList className={`w-6 h-6 ${
                          duty.status === 'completed' ? 'text-secondary' : 'text-accent'
                        }`} />
                      </div>
                      <div>
                        <h3 className="font-display font-semibold text-lg text-foreground">
                          {duty.exam}
                        </h3>
                        <p className="text-sm text-muted-foreground mb-2">{duty.subject}</p>
                        <div className="flex flex-wrap gap-4 text-sm">
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <Calendar className="w-4 h-4" /> {duty.date}
                          </span>
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <Clock className="w-4 h-4" /> {duty.time}
                          </span>
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <MapPin className="w-4 h-4" /> Block {duty.block} - {duty.room}
                          </span>
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <Users className="w-4 h-4" /> {duty.students} students
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Badge variant={duty.status === 'completed' ? 'secondary' : 'default'}>
                        {duty.status === 'completed' ? 'Completed' : 'Upcoming'}
                      </Badge>
                      {duty.status === 'upcoming' && (
                        <Button
                          variant="faculty"
                          onClick={() => setSelectedDuty(duty.id)}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View & Mark Attendance
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Attendance Modal */}
          {selectedDuty && (
            <div className="fixed inset-0 bg-foreground/50 flex items-center justify-center z-50 p-6">
              <div className="bg-card rounded-2xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden animate-slide-up">
                <div className="p-6 border-b border-border">
                  <h3 className="text-xl font-display font-bold text-foreground">
                    Mark Attendance
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {invigilationDuties.find(d => d.id === selectedDuty)?.exam}
                  </p>
                </div>

                <div className="p-6 max-h-[50vh] overflow-y-auto">
                  <div className="space-y-3">
                    {demoStudents.map((student) => (
                      <div
                        key={student.id}
                        className="flex items-center justify-between p-4 rounded-xl bg-muted/50"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="font-semibold text-primary text-sm">
                              {student.name.split(' ').map(n => n[0]).join('')}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{student.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {student.id} • Seat: {student.seat}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant={attendance[student.id] ? 'secondary' : 'destructive'}
                          size="sm"
                          onClick={() => toggleAttendance(student.id)}
                        >
                          {attendance[student.id] ? (
                            <>
                              <CheckCircle2 className="w-4 h-4 mr-1" /> Present
                            </>
                          ) : (
                            <>
                              <XCircle className="w-4 h-4 mr-1" /> Absent
                            </>
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-6 border-t border-border flex justify-end gap-3">
                  <Button variant="outline" onClick={() => setSelectedDuty(null)}>
                    Cancel
                  </Button>
                  <Button variant="faculty" onClick={submitAttendance}>
                    <Send className="w-4 h-4 mr-2" />
                    Submit Attendance
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default FacultyDashboard;
