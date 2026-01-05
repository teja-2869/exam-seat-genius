import React, { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  ClipboardList, 
  Calendar,
  MapPin,
  Clock,
  Users,
  CheckCircle2,
  XCircle,
  Eye,
  Send,
  FileText,
  Bell,
  Settings,
  Download,
  Search,
  Filter
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const invigilationDuties = [
  {
    id: 1,
    exam: 'Data Structures - Internal',
    subject: 'CS301',
    date: 'Jan 15, 2025',
    time: '10:00 AM - 1:00 PM',
    room: '1101',
    block: 'Block 1',
    floor: 1,
    students: 45,
    status: 'upcoming'
  },
  {
    id: 2,
    exam: 'Database Management - External',
    subject: 'CS302',
    date: 'Jan 18, 2025',
    time: '2:00 PM - 5:00 PM',
    room: '1201',
    block: 'Block 1',
    floor: 2,
    students: 52,
    status: 'upcoming'
  },
  {
    id: 3,
    exam: 'Computer Networks - Internal',
    subject: 'CS304',
    date: 'Jan 12, 2025',
    time: '10:00 AM - 1:00 PM',
    room: '2101',
    block: 'Block 2',
    floor: 1,
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
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedDuty, setSelectedDuty] = useState<number | null>(null);
  const [showNotificationDialog, setShowNotificationDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [showDutyDetails, setShowDutyDetails] = useState<any>(null);
  const [attendance, setAttendance] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    demoStudents.forEach(s => { initial[s.id] = s.present; });
    return initial;
  });
  
  const [notificationForm, setNotificationForm] = useState({
    title: '',
    message: '',
    recipients: 'students'
  });

  const quickActions = [
    { label: 'Mark Attendance', icon: CheckCircle2, description: 'Take attendance for exams', variant: 'faculty' as const },
    { label: 'View Schedule', icon: Calendar, description: 'See upcoming duties', variant: 'secondary' as const },
    { label: 'Send Notifications', icon: Bell, description: 'Notify students', variant: 'outline' as const },
    { label: 'Settings', icon: Settings, description: 'Manage preferences', variant: 'outline' as const },
  ];

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'Mark Attendance':
        const upcomingDuty = invigilationDuties.find(d => d.status === 'upcoming');
        if (upcomingDuty) {
          setSelectedDuty(upcomingDuty.id);
        } else {
          toast({
            title: 'No Upcoming Duties',
            description: 'You have no upcoming exams to mark attendance for.',
            variant: 'destructive'
          });
        }
        break;
      case 'View Schedule':
        // Scroll to duties section
        document.getElementById('duties-section')?.scrollIntoView({ behavior: 'smooth' });
        break;
      case 'Send Notifications':
        setShowNotificationDialog(true);
        break;
      case 'Settings':
        setShowSettingsDialog(true);
        break;
      default:
        break;
    }
  };

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

  const handleSendNotification = () => {
    console.log('Sending notification:', notificationForm);
    toast({
      title: 'Notification Sent',
      description: 'Your notification has been sent to students.',
    });
    setShowNotificationDialog(false);
    setNotificationForm({ title: '', message: '', recipients: 'students' });
  };

  const handleViewDutyDetails = (duty: any) => {
    setShowDutyDetails(duty);
  };

  const handleDownloadReport = (duty: any) => {
    const reportData = {
      exam: duty.exam,
      subject: duty.subject,
      date: duty.date,
      time: duty.time,
      room: duty.room,
      block: duty.block,
      students: duty.students,
      attendance: attendance,
      generatedAt: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-report-${duty.exam.replace(/\s+/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
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

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Quick Actions */}
            <div className="lg:col-span-1 animate-slide-up stagger-3">
              <Card className="dashboard-card">
                <CardHeader>
                  <CardTitle className="text-xl font-display font-bold text-foreground">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {quickActions.map((action) => (
                    <Button
                      key={action.label}
                      variant={action.variant}
                      className="w-full justify-start h-auto py-4"
                      onClick={() => handleQuickAction(action.label)}
                    >
                      <action.icon className="w-5 h-5 mr-3" />
                      <div className="text-left">
                        <p className="font-semibold">{action.label}</p>
                        <p className="text-xs opacity-80">{action.description}</p>
                      </div>
                    </Button>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Invigilation Duties */}
            <div className="lg:col-span-2 animate-slide-up stagger-4" id="duties-section">
              <Card className="dashboard-card">
                <CardHeader>
                  <CardTitle className="text-xl font-display font-bold text-foreground">
                    Invigilation Duties
                  </CardTitle>
                </CardHeader>
                <CardContent>
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
                                  <MapPin className="w-4 h-4" /> {duty.block} - Floor {duty.floor} - Room {duty.room}
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
                            <div className="flex gap-1">
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => handleViewDutyDetails(duty)}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              {duty.status === 'completed' && (
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => handleDownloadReport(duty)}
                                >
                                  <Download className="w-4 h-4" />
                                </Button>
                              )}
                              {duty.status === 'upcoming' && (
                                <Button
                                  variant="faculty"
                                  onClick={() => setSelectedDuty(duty.id)}
                                >
                                  <Eye className="w-4 h-4 mr-2" />
                                  Mark Attendance
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
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

          {/* Notification Dialog */}
          <Dialog open={showNotificationDialog} onOpenChange={setShowNotificationDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Send Notification</DialogTitle>
                <DialogDescription>
                  Send notifications to students about upcoming exams or important updates
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="notification-title">Title</Label>
                  <Input
                    id="notification-title"
                    value={notificationForm.title}
                    onChange={(e) => setNotificationForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g., Exam Schedule Update"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="recipients">Recipients</Label>
                  <Select value={notificationForm.recipients} onValueChange={(value) => setNotificationForm(prev => ({ ...prev, recipients: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select recipients" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="students">Students Only</SelectItem>
                      <SelectItem value="all">All Users</SelectItem>
                      <SelectItem value="faculty">Faculty Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notification-message">Message</Label>
                  <textarea
                    id="notification-message"
                    value={notificationForm.message}
                    onChange={(e) => setNotificationForm(prev => ({ ...prev, message: e.target.value }))}
                    placeholder="Enter your notification message here..."
                    rows={4}
                    className="w-full p-3 border rounded-lg resize-none"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowNotificationDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSendNotification}>
                  <Send className="w-4 h-4 mr-2" />
                  Send Notification
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Settings Dialog */}
          <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Settings</DialogTitle>
                <DialogDescription>
                  Manage your faculty preferences and account settings
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Notification Preferences</Label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2">
                      <input type="checkbox" defaultChecked />
                      <span className="text-sm">Email notifications for upcoming duties</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" defaultChecked />
                      <span className="text-sm">SMS notifications for urgent updates</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" />
                      <span className="text-sm">Daily attendance reminders</span>
                    </label>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Display Settings</Label>
                  <Select defaultValue="light">
                    <SelectTrigger>
                      <SelectValue placeholder="Select theme" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light Mode</SelectItem>
                      <SelectItem value="dark">Dark Mode</SelectItem>
                      <SelectItem value="system">System Default</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowSettingsDialog(false)}>
                  Cancel
                </Button>
                <Button>Save Settings</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Duty Details Dialog */}
          <Dialog open={!!showDutyDetails} onOpenChange={() => setShowDutyDetails(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Duty Details</DialogTitle>
                <DialogDescription>
                  Complete information about your invigilation duty
                </DialogDescription>
              </DialogHeader>
              {showDutyDetails && (
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Exam</Label>
                      <p className="font-semibold">{showDutyDetails.exam}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Subject</Label>
                      <p className="font-semibold">{showDutyDetails.subject}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Date</Label>
                      <p className="font-semibold">{showDutyDetails.date}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Time</Label>
                      <p className="font-semibold">{showDutyDetails.time}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Location</Label>
                      <p className="font-semibold">{showDutyDetails.block} - Floor {showDutyDetails.floor} - Room {showDutyDetails.room}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Students</Label>
                      <p className="font-semibold">{showDutyDetails.students}</p>
                    </div>
                  </div>
                </div>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowDutyDetails(null)}>
                  Close
                </Button>
                {showDutyDetails?.status === 'upcoming' && (
                  <Button onClick={() => {
                    setShowDutyDetails(null);
                    setSelectedDuty(showDutyDetails.id);
                  }}>
                    Mark Attendance
                  </Button>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </main>
    </div>
  );
};

export default FacultyDashboard;
