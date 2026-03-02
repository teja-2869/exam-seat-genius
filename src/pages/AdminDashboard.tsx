import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { KPICards } from '@/components/dashboard/KPICards';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { ActivityFeed } from '@/components/dashboard/ActivityFeed';
import {
  Building2,
  Users,
  GraduationCap,
  ClipboardList,
  Grid3X3,
  UserCheck,
  Bell,
  BarChart3,
  Plus,
  ArrowRight,
  Sparkles,
  Eye,
  Edit,
  Trash2,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

// Hardcoded stats and quick actions removed in favor of modular components

const recentExams = [
  {
    id: '1',
    name: 'Data Structures Midterm',
    subject: 'Data Structures',
    type: 'Internal',
    duration: '3 hours',
    room: '1101 - Block 1',
    date: '2025-01-15',
    students: 45,
    status: 'Scheduled'
  },
  {
    id: '2',
    name: 'Database Management Final',
    subject: 'Database Management',
    type: 'External',
    duration: '3 hours',
    room: '1201 - Block 1',
    date: '2025-01-18',
    students: 52,
    status: 'Scheduled'
  },
  {
    id: '3',
    name: 'Computer Networks Quiz',
    subject: 'Computer Networks',
    type: 'Internal',
    duration: '3 hours',
    room: '2101 - Block 2',
    date: '2025-01-20',
    students: 48,
    status: 'Completed'
  },
];

const facultyList = [
  { id: '1', name: 'Dr. Sarah Johnson', department: 'Computer Science', available: true },
  { id: '2', name: 'Prof. Michael Chen', department: 'Computer Science', available: true },
  { id: '3', name: 'Dr. Emily Williams', department: 'Information Technology', available: false },
  { id: '4', name: 'Prof. David Brown', department: 'Computer Science', available: true },
];

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { college, user } = useAuth();
  const [selectedExam, setSelectedExam] = useState<any>(null);
  const [showExamDetails, setShowExamDetails] = useState(false);
  const [showCreateExam, setShowCreateExam] = useState(false);
  const [showAssignInvigilators, setShowAssignInvigilators] = useState(false);
  const [showNotificationDialog, setShowNotificationDialog] = useState(false);
  const [showSeatingDialog, setShowSeatingDialog] = useState(false);

  // Form states
  const [examForm, setExamForm] = useState({
    name: '',
    subject: '',
    type: '',
    date: '',
    duration: '',
    room: '',
    description: ''
  });

  const [notificationForm, setNotificationForm] = useState({
    title: '',
    message: '',
    recipients: 'all'
  });

  const [selectedInvigilators, setSelectedInvigilators] = useState<string[]>([]);

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'Create Exam':
        setShowCreateExam(true);
        break;
      case 'Arrange Seating':
        setShowSeatingDialog(true);
        break;
      case 'Assign Invigilators':
        setShowAssignInvigilators(true);
        break;
      case 'Send Notifications':
        setShowNotificationDialog(true);
        break;
      default:
        break;
    }
  };

  const handleCreateExam = () => {
    // Create exam logic here
    console.log('Creating exam:', examForm);
    setShowCreateExam(false);
    // Reset form
    setExamForm({
      name: '',
      subject: '',
      type: '',
      date: '',
      duration: '',
      room: '',
      description: ''
    });
  };

  const handleAssignInvigilators = () => {
    // Assign invigilators logic here
    console.log('Assigning invigilators:', selectedInvigilators);
    setShowAssignInvigilators(false);
    setSelectedInvigilators([]);
  };

  const handleSendNotification = () => {
    // Send notification logic here
    console.log('Sending notification:', notificationForm);
    setShowNotificationDialog(false);
    // Reset form
    setNotificationForm({
      title: '',
      message: '',
      recipients: 'all'
    });
  };

  const handleArrangeSeating = () => {
    // Navigate to seating arrangement or open seating dialog
    navigate('/admin-generate-seating');
  };

  const handleViewExamDetails = (exam: any) => {
    setSelectedExam(exam);
    setShowExamDetails(true);
  };

  const handleEditExam = (exam: any) => {
    setSelectedExam(exam);
    setExamForm({
      name: exam.name,
      subject: exam.subject,
      type: exam.type,
      date: exam.date,
      duration: exam.duration,
      room: exam.room,
      description: ''
    });
    setShowCreateExam(true);
  };

  const handleDeleteExam = (examId: string) => {
    // Delete exam logic here
    console.log('Deleting exam:', examId);
  };

  const toggleInvigilatorSelection = (facultyId: string) => {
    setSelectedInvigilators(prev =>
      prev.includes(facultyId)
        ? prev.filter(id => id !== facultyId)
        : [...prev, facultyId]
    );
  };

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto space-y-8 animate-fade-in">

        {/* Breadcrumb & Welcome Section */}
        <div>
          <div className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
            <span>Admin</span>
            <span>/</span>
            <span className="text-foreground font-medium">Dashboard</span>
          </div>
          <h1 className="text-3xl font-display font-bold text-foreground mb-2">
            Welcome back, {user?.name || 'Admin'}
          </h1>
          <p className="text-muted-foreground">
            Manage examinations for {college?.name || 'your college'}
          </p>
        </div>

        {/* Top Section - KPI Cards */}
        <KPICards />

        {/* Middle & Bottom Sections - Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          <div className="lg:col-span-1 space-y-6">
            {/* Quick Actions */}
            <div className="animate-slide-up stagger-1 h-fit">
              <QuickActions />
            </div>

            {/* Activity Feed */}
            <div className="animate-slide-up stagger-2 h-96">
              <ActivityFeed />
            </div>
          </div>

          {/* Recent Exams */}
          <div className="lg:col-span-2 animate-slide-up stagger-2">
            <Card className="dashboard-card">
              <div className="flex items-center justify-between mb-6">
                <CardTitle className="text-xl font-display font-bold text-foreground">Recent Exams</CardTitle>
                <Button variant="ghost" size="sm">
                  View All <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>

              <div className="space-y-4">
                {recentExams.map((exam, index) => (
                  <div
                    key={exam.id}
                    className="flex items-center justify-between p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                    onClick={() => handleViewExamDetails(exam)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <ClipboardList className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{exam.name}</p>
                        <p className="text-sm text-muted-foreground">{exam.date} • {exam.room}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm font-medium text-foreground">{exam.students} students</p>
                        <Badge variant={exam.status === 'Published' ? 'default' : 'secondary'}>
                          {exam.status}
                        </Badge>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewExamDetails(exam);
                          }}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditExam(exam);
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteExam(exam.id);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>

        {/* AI Validation Banner */}
        <div className="mt-8 animate-slide-up stagger-3">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary to-secondary p-8">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
                  <Sparkles className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-display font-bold text-white mb-1">
                    AI-Powered Seating Validation
                  </h3>
                  <p className="text-white/80">
                    Use Google Gemini to validate seating arrangements and prevent conflicts
                  </p>
                </div>
              </div>
              <Button variant="glass" size="lg" onClick={handleArrangeSeating}>
                Run Validation
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Create/Edit Exam Dialog */}
      <Dialog open={showCreateExam} onOpenChange={setShowCreateExam}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{selectedExam ? 'Edit Exam' : 'Create New Exam'}</DialogTitle>
            <DialogDescription>
              {selectedExam ? 'Edit the examination details.' : 'Set up a new examination for your students.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="exam-name">Exam Name</Label>
                <Input
                  id="exam-name"
                  value={examForm.name}
                  onChange={(e) => setExamForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Data Structures Midterm"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  value={examForm.subject}
                  onChange={(e) => setExamForm(prev => ({ ...prev, subject: e.target.value }))}
                  placeholder="e.g., Data Structures"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="exam-type">Exam Type</Label>
                <Select value={examForm.type} onValueChange={(value) => setExamForm(prev => ({ ...prev, type: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select exam type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="internal">Internal</SelectItem>
                    <SelectItem value="external">External</SelectItem>
                    <SelectItem value="practical">Practical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="duration">Duration</Label>
                <Input
                  id="duration"
                  value={examForm.duration}
                  onChange={(e) => setExamForm(prev => ({ ...prev, duration: e.target.value }))}
                  placeholder="e.g., 3 hours"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={examForm.date}
                  onChange={(e) => setExamForm(prev => ({ ...prev, date: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="room">Room</Label>
                <Input
                  id="room"
                  value={examForm.room}
                  onChange={(e) => setExamForm(prev => ({ ...prev, room: e.target.value }))}
                  placeholder="e.g., 1101 - Block 1"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={examForm.description}
                onChange={(e) => setExamForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Additional exam details or instructions"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateExam(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateExam}>
              {selectedExam ? 'Update Exam' : 'Create Exam'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Exam Details Dialog */}
      <Dialog open={showExamDetails} onOpenChange={setShowExamDetails}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Exam Details</DialogTitle>
            <DialogDescription>
              Complete information about the examination
            </DialogDescription>
          </DialogHeader>
          {selectedExam && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Exam Name</Label>
                  <p className="font-semibold">{selectedExam.name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Subject</Label>
                  <p className="font-semibold">{selectedExam.subject}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Type</Label>
                  <p className="font-semibold">{selectedExam.type}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Duration</Label>
                  <p className="font-semibold">{selectedExam.duration}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Date</Label>
                  <p className="font-semibold">{selectedExam.date}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Room</Label>
                  <p className="font-semibold">{selectedExam.room}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Students</Label>
                  <p className="font-semibold">{selectedExam.students}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                  <Badge variant={selectedExam.status === 'Published' ? 'default' : 'secondary'}>
                    {selectedExam.status}
                  </Badge>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExamDetails(false)}>
              Close
            </Button>
            <Button onClick={() => {
              setShowExamDetails(false);
              handleEditExam(selectedExam);
            }}>
              Edit Exam
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Invigilators Dialog */}
      <Dialog open={showAssignInvigilators} onOpenChange={setShowAssignInvigilators}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Assign Invigilators</DialogTitle>
            <DialogDescription>
              Select faculty members for invigilation duties
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Available Faculty</Label>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {facultyList.map((faculty) => (
                  <div key={faculty.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selectedInvigilators.includes(faculty.id)}
                        onChange={() => toggleInvigilatorSelection(faculty.id)}
                        className="rounded"
                      />
                      <div>
                        <p className="font-medium">{faculty.name}</p>
                        <p className="text-sm text-muted-foreground">{faculty.department}</p>
                      </div>
                    </div>
                    <Badge variant={faculty.available ? 'default' : 'secondary'}>
                      {faculty.available ? 'Available' : 'Busy'}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignInvigilators(false)}>
              Cancel
            </Button>
            <Button onClick={handleAssignInvigilators} disabled={selectedInvigilators.length === 0}>
              Assign {selectedInvigilators.length} Invigilator{selectedInvigilators.length !== 1 ? 's' : ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send Notifications Dialog */}
      <Dialog open={showNotificationDialog} onOpenChange={setShowNotificationDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Send Notifications</DialogTitle>
            <DialogDescription>
              Send notifications to students and faculty
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="notification-title">Title</Label>
              <Input
                id="notification-title"
                value={notificationForm.title}
                onChange={(e) => setNotificationForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g., Exam Schedule Updated"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="recipients">Recipients</Label>
              <Select value={notificationForm.recipients} onValueChange={(value) => setNotificationForm(prev => ({ ...prev, recipients: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select recipients" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  <SelectItem value="students">Students Only</SelectItem>
                  <SelectItem value="faculty">Faculty Only</SelectItem>
                  <SelectItem value="admins">Admins Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notification-message">Message</Label>
              <Textarea
                id="notification-message"
                value={notificationForm.message}
                onChange={(e) => setNotificationForm(prev => ({ ...prev, message: e.target.value }))}
                placeholder="Enter your notification message here..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNotificationDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSendNotification}>
              Send Notification
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Seating Arrangement Dialog */}
      <Dialog open={showSeatingDialog} onOpenChange={setShowSeatingDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Arrange Seating</DialogTitle>
            <DialogDescription>
              Set up AI-powered seating arrangements for examinations
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
              <Sparkles className="w-5 h-5 text-primary" />
              <div>
                <p className="font-medium">AI-Powered Seating</p>
                <p className="text-sm text-muted-foreground">
                  Our AI will automatically assign seats following all validation rules
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Validation Rules Applied:</Label>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Same branch students cannot sit adjacent</li>
                <li>• Same exam students cannot sit beside</li>
                <li>• Consecutive roll numbers separated</li>
                <li>• Optimal room utilization</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSeatingDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleArrangeSeating}>
              Proceed to Seating
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminDashboard;
