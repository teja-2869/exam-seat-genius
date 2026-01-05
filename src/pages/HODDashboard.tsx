import React, { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  Upload, 
  Building2, 
  ClipboardList,
  Eye,
  UserCheck,
  FileSpreadsheet,
  ArrowRight,
  Plus,
  Download,
  Search,
  Filter,
  Edit,
  Trash2,
  AlertCircle,
  CheckCircle
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
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const stats = [
  { label: 'Department Students', value: '385', icon: Users, color: 'text-secondary', bg: 'bg-secondary/10' },
  { label: 'Classrooms', value: '12', icon: Building2, color: 'text-primary', bg: 'bg-primary/10' },
  { label: 'Upcoming Exams', value: '4', icon: ClipboardList, color: 'text-accent', bg: 'bg-accent/10' },
  { label: 'Faculty', value: '28', icon: UserCheck, color: 'text-panel-student', bg: 'bg-panel-student/10' },
];

const quickActions = [
  { label: 'Upload Students', icon: Upload, description: 'Import student data via CSV', variant: 'hod' as const },
  { label: 'Manage Classrooms', icon: Building2, description: 'Add or edit classroom details', variant: 'secondary' as const },
  { label: 'View Seating', icon: Eye, description: 'Check seating arrangements', variant: 'outline' as const },
  { label: 'View Invigilation', icon: UserCheck, description: 'See invigilation duties', variant: 'outline' as const },
];

const recentUploads = [
  { 
    id: '1',
    name: 'Students_Sem4_2025.csv', 
    date: 'Jan 10, 2025', 
    records: 120, 
    status: 'Processed',
    type: 'students',
    department: 'Computer Science'
  },
  { 
    id: '2',
    name: 'Classroom_Block_A.csv', 
    date: 'Jan 8, 2025', 
    records: 8, 
    status: 'Processed',
    type: 'classrooms',
    department: 'Computer Science'
  },
  { 
    id: '3',
    name: 'Faculty_List.csv', 
    date: 'Jan 5, 2025', 
    records: 28, 
    status: 'Processed',
    type: 'faculty',
    department: 'Computer Science'
  },
];

const mockClassrooms = [
  { id: '1101', name: 'Room 1101', block: 'Block 1', floor: 1, roomNumber: '1101', capacity: 40, type: 'Lecture Hall', equipment: 'Projector, Whiteboard' },
  { id: '1201', name: 'Room 1201', block: 'Block 1', floor: 2, roomNumber: '1201', capacity: 35, type: 'Lab', equipment: 'Computers, Projector' },
  { id: '2101', name: 'Room 2101', block: 'Block 2', floor: 1, roomNumber: '2101', capacity: 40, type: 'Lecture Hall', equipment: 'Projector, Smart Board' },
  { id: '2201', name: 'Room 2201', block: 'Block 2', floor: 2, roomNumber: '2201', capacity: 35, type: 'Lab', equipment: 'Computers, Whiteboard' },
];

const mockInvigilationDuties = [
  { id: '1', exam: 'Data Structures Midterm', date: 'Jan 15, 2025', room: '1101', block: 'Block 1', faculty: 'Dr. Sarah Johnson', status: 'Assigned' },
  { id: '2', exam: 'Database Management Final', date: 'Jan 18, 2025', room: '1201', block: 'Block 1', faculty: 'Prof. Michael Chen', status: 'Pending' },
  { id: '3', exam: 'Computer Networks Quiz', date: 'Jan 20, 2025', room: '2101', block: 'Block 2', faculty: 'Dr. Emily Williams', status: 'Assigned' },
];

const HODDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { college, user } = useAuth();
  
  // Dialog states
  const [showStudentUpload, setShowStudentUpload] = useState(false);
  const [showClassroomDialog, setShowClassroomDialog] = useState(false);
  const [showSeatingDialog, setShowSeatingDialog] = useState(false);
  const [showInvigilationDialog, setShowInvigilationDialog] = useState(false);
  const [showUploadDetails, setShowUploadDetails] = useState(false);
  const [selectedUpload, setSelectedUpload] = useState<any>(null);
  
  // Form states
  const [classroomForm, setClassroomForm] = useState({
    name: '',
    block: '',
    capacity: '',
    type: '',
    equipment: '',
    floor: ''
  });
  
  const [uploadStatus, setUploadStatus] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'Upload Students':
        setShowStudentUpload(true);
        break;
      case 'Manage Classrooms':
        setShowClassroomDialog(true);
        break;
      case 'View Seating':
        setShowSeatingDialog(true);
        break;
      case 'View Invigilation':
        setShowInvigilationDialog(true);
        break;
      default:
        break;
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadStatus(`Processing ${file.name}...`);
      // Simulate file processing
      setTimeout(() => {
        setUploadStatus(`Successfully uploaded ${file.name}`);
        setShowStudentUpload(false);
      }, 2000);
    }
  };

  const handleAddClassroom = () => {
    console.log('Adding classroom:', classroomForm);
    setShowClassroomDialog(false);
    setClassroomForm({
      name: '',
      block: '',
      capacity: '',
      type: '',
      equipment: '',
      floor: ''
    });
  };

  const handleViewUploadDetails = (upload: any) => {
    setSelectedUpload(upload);
    setShowUploadDetails(true);
  };

  const handleDeleteUpload = (uploadId: string) => {
    console.log('Deleting upload:', uploadId);
  };

  const handleDownloadTemplate = () => {
    // Create and download CSV template
    const template = 'Name,Roll Number,Branch,Semester,Email\nJohn Doe,CS001,Computer Science,4,john@college.edu';
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'student_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-24 pb-12 px-6">
        <div className="max-w-7xl mx-auto">
          {/* Welcome Section */}
          <div className="mb-8 animate-fade-in">
            <h1 className="text-3xl font-display font-bold text-foreground mb-2">
              Department Dashboard
            </h1>
            <p className="text-muted-foreground">
              Manage student and classroom data for your department
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {stats.map((stat, index) => (
              <div
                key={stat.label}
                className="dashboard-card animate-slide-up"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">{stat.label}</p>
                    <p className="text-3xl font-display font-bold text-foreground">{stat.value}</p>
                  </div>
                  <div className={`w-12 h-12 rounded-xl ${stat.bg} flex items-center justify-center`}>
                    <stat.icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Quick Actions */}
            <div className="lg:col-span-1 animate-slide-up stagger-1">
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

            {/* Recent Uploads */}
            <div className="lg:col-span-2 animate-slide-up stagger-2">
              <Card className="dashboard-card">
                <div className="flex items-center justify-between mb-6">
                  <CardTitle className="text-xl font-display font-bold text-foreground">Recent Uploads</CardTitle>
                  <Button variant="ghost" size="sm">
                    View All <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>

                <div className="space-y-4">
                  {recentUploads.map((upload) => (
                    <div
                      key={upload.id}
                      className="flex items-center justify-between p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                      onClick={() => handleViewUploadDetails(upload)}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center">
                          <FileSpreadsheet className="w-5 h-5 text-secondary" />
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">{upload.name}</p>
                          <p className="text-sm text-muted-foreground">{upload.date} • {upload.department}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm font-medium text-foreground">{upload.records} records</p>
                          <Badge variant={upload.status === 'Processed' ? 'default' : 'secondary'}>
                            {upload.status}
                          </Badge>
                        </div>
                        <div className="flex gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewUploadDetails(upload);
                            }}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteUpload(upload.id);
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

          {/* Upload Section */}
          <div className="mt-8 animate-slide-up stagger-3">
            <Card className="dashboard-card">
              <CardHeader>
                <CardTitle className="text-xl font-display font-bold text-foreground">
                  Upload Data
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Student Upload */}
                  <div className="border-2 border-dashed border-border rounded-2xl p-8 text-center hover:border-secondary transition-colors cursor-pointer"
                       onClick={() => setShowStudentUpload(true)}>
                    <div className="w-16 h-16 rounded-2xl bg-secondary/10 flex items-center justify-center mx-auto mb-4">
                      <Users className="w-8 h-8 text-secondary" />
                    </div>
                    <h3 className="font-display font-semibold text-lg mb-2">Upload Students</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Import student data from CSV file
                    </p>
                    <Button variant="hod">
                      <Upload className="w-4 h-4 mr-2" />
                      Choose File
                    </Button>
                  </div>

                  {/* Classroom Upload */}
                  <div className="border-2 border-dashed border-border rounded-2xl p-8 text-center hover:border-primary transition-colors cursor-pointer"
                       onClick={() => setShowClassroomDialog(true)}>
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                      <Building2 className="w-8 h-8 text-primary" />
                    </div>
                    <h3 className="font-display font-semibold text-lg mb-2">Add Classroom</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Enter classroom and lab details
                    </p>
                    <Button variant="default">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Room
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Student Upload Dialog */}
      <Dialog open={showStudentUpload} onOpenChange={setShowStudentUpload}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Student Data</DialogTitle>
            <DialogDescription>
              Import student information from a CSV file. Make sure your file follows the required format.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
              <Upload className="w-8 h-8 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-3">
                Click to browse or drag and drop CSV file here
              </p>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
                id="student-file-upload"
              />
              <Button asChild variant="outline">
                <label htmlFor="student-file-upload" className="cursor-pointer">
                  Choose File
                </label>
              </Button>
            </div>
            
            <div className="flex justify-center">
              <Button variant="outline" onClick={handleDownloadTemplate}>
                <Download className="w-4 h-4 mr-2" />
                Download Template
              </Button>
            </div>
            
            {uploadStatus && (
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">{uploadStatus}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStudentUpload(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Classroom Management Dialog */}
      <Dialog open={showClassroomDialog} onOpenChange={setShowClassroomDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add/Edit Classroom</DialogTitle>
            <DialogDescription>
              Enter classroom details and available equipment
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="room-name">Room Name</Label>
                <Input
                  id="room-name"
                  value={classroomForm.name}
                  onChange={(e) => setClassroomForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., 1105"
                />
                <p className="text-xs text-muted-foreground">Format: Block-Floor-Room (e.g., 1105)</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="block">Block</Label>
                <Select value={classroomForm.block} onValueChange={(value) => setClassroomForm(prev => ({ ...prev, block: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select block" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Block 1">Block 1</SelectItem>
                    <SelectItem value="Block 2">Block 2</SelectItem>
                    <SelectItem value="Block 3">Block 3</SelectItem>
                    <SelectItem value="Block 4">Block 4</SelectItem>
                    <SelectItem value="Block 5">Block 5</SelectItem>
                    <SelectItem value="Block 6">Block 6</SelectItem>
                    <SelectItem value="Block 7">Block 7</SelectItem>
                    <SelectItem value="Block 8">Block 8</SelectItem>
                    <SelectItem value="Block 9">Block 9</SelectItem>
                    <SelectItem value="Block 10">Block 10</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="capacity">Capacity</Label>
                <Input
                  id="capacity"
                  type="number"
                  value={classroomForm.capacity}
                  onChange={(e) => setClassroomForm(prev => ({ ...prev, capacity: e.target.value }))}
                  placeholder="e.g., 40"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="room-type">Room Type</Label>
                <Select value={classroomForm.type} onValueChange={(value) => setClassroomForm(prev => ({ ...prev, type: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Lecture Hall">Lecture Hall</SelectItem>
                    <SelectItem value="Lab">Lab</SelectItem>
                    <SelectItem value="Seminar Room">Seminar Room</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="floor">Floor</Label>
                <Select value={classroomForm.floor} onValueChange={(value) => setClassroomForm(prev => ({ ...prev, floor: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select floor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Floor 1</SelectItem>
                    <SelectItem value="2">Floor 2</SelectItem>
                    <SelectItem value="3">Floor 3</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="room-number">Room Number</Label>
                <Input
                  id="room-number"
                  value={classroomForm.name}
                  onChange={(e) => setClassroomForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., 1105"
                  pattern="[0-9]{4}"
                />
                <p className="text-xs text-muted-foreground">Format: Block-Floor-Room (e.g., 1105)</p>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="equipment">Equipment</Label>
              <Textarea
                id="equipment"
                value={classroomForm.equipment}
                onChange={(e) => setClassroomForm(prev => ({ ...prev, equipment: e.target.value }))}
                placeholder="e.g., Projector, Whiteboard, Computers"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowClassroomDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddClassroom}>
              Add Classroom
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Seating View Dialog */}
      <Dialog open={showSeatingDialog} onOpenChange={setShowSeatingDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Seating Arrangements</DialogTitle>
            <DialogDescription>
              View current seating arrangements for upcoming exams
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-3">
              {mockClassrooms.slice(0, 3).map((room) => (
                <div key={room.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{room.name}</p>
                    <p className="text-sm text-muted-foreground">{room.block} • Capacity: {room.capacity}</p>
                  </div>
                  <Button variant="outline" size="sm">
                    <Eye className="w-4 h-4 mr-2" />
                    View Layout
                  </Button>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSeatingDialog(false)}>
              Close
            </Button>
            <Button onClick={() => navigate('/admin-generate-seating')}>
              Manage Seating
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invigilation View Dialog */}
      <Dialog open={showInvigilationDialog} onOpenChange={setShowInvigilationDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Invigilation Duties</DialogTitle>
            <DialogDescription>
              View assigned invigilation duties for faculty members
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-3">
              {mockInvigilationDuties.map((duty) => (
                <div key={duty.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{duty.exam}</p>
                    <p className="text-sm text-muted-foreground">{duty.date} • {duty.room}</p>
                    <p className="text-sm text-muted-foreground">Faculty: {duty.faculty}</p>
                  </div>
                  <Badge variant={duty.status === 'Assigned' ? 'default' : 'secondary'}>
                    {duty.status}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInvigilationDialog(false)}>
              Close
            </Button>
            <Button onClick={() => navigate('/admin-dashboard')}>
              Manage Duties
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload Details Dialog */}
      <Dialog open={showUploadDetails} onOpenChange={setShowUploadDetails}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Details</DialogTitle>
            <DialogDescription>
              Complete information about the uploaded file
            </DialogDescription>
          </DialogHeader>
          {selectedUpload && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">File Name</Label>
                  <p className="font-semibold">{selectedUpload.name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Upload Date</Label>
                  <p className="font-semibold">{selectedUpload.date}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Type</Label>
                  <p className="font-semibold capitalize">{selectedUpload.type}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Records</Label>
                  <p className="font-semibold">{selectedUpload.records}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Department</Label>
                  <p className="font-semibold">{selectedUpload.department}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                  <Badge variant={selectedUpload.status === 'Processed' ? 'default' : 'secondary'}>
                    {selectedUpload.status}
                  </Badge>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUploadDetails(false)}>
              Close
            </Button>
            <Button>
              <Download className="w-4 h-4 mr-2" />
              Download Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HODDashboard;
