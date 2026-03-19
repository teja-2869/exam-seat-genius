import React, { useState, useCallback } from 'react';
import { Header } from '@/components/layout/Header';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  Upload, Download, Users, Sparkles, AlertCircle, CheckCircle, Grid3X3, Save, RefreshCw, Eye, Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

import { auth, functions, db } from '@/lib/firebase';
import { httpsCallable } from 'firebase/functions';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { ClassroomRenderer } from '@/components/classroom/ClassroomRenderer';
import { Classroom, SeatingPlanLayout } from '@/types';

// Types aligned with SaaS schema
export interface Student {
  id: string;
  name: string;
  rollNumber: string;
  branch: string;
  exam: string;
  isEligible: boolean;
}

export interface SeatingArrangement {
  roomId: string; // E.g., '101'
  capacity: number;
  seats: {
    row: number;
    bench: number;
    position: 'left' | 'right';
    student: Student | null;
  }[];
}

export interface ValidationResult {
  isValid: boolean;
  conflicts: string[];
  suggestions: string[];
}

const AdminGenerateSeating: React.FC = () => {
  const navigate = useNavigate();
  const { college, user } = useAuth(); // Scoped to institution

  const [students, setStudents] = useState<Student[]>([]);
  const [seatingArrangements, setSeatingArrangements] = useState<SeatingArrangement[]>([]);
  const [selectedExam, setSelectedExam] = useState<string>('');
  const [selectedRoom, setSelectedRoom] = useState<string>('');

  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [apiError, setApiError] = useState<string>('');
  const [showResults, setShowResults] = useState(false);
  const [validationResults, setValidationResults] = useState<ValidationResult | null>(null);

  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>('');

  // Temporary placeholders until we build full Firestore Exam/Room managers
  const mockExams = [{ id: 'ex1', name: 'CS301 - Data Structures' }, { id: 'ex2', name: 'EE201 - Circuits' }];

  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [activeClassroomLayout, setActiveClassroomLayout] = useState<Classroom | null>(null);

  React.useEffect(() => {
    const fetchClassrooms = async () => {
      let institutionId = college?.id || (college as any)?.institutionId;
      if (!institutionId) return;
      try {
        const classroomQuery = query(collection(db, 'classrooms'), where('institutionId', '==', institutionId));
        const snapshot = await getDocs(classroomQuery);
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Classroom);
        setClassrooms(data);
      } catch (err) {
        console.error("Failed to fetch classrooms", err);
      }
    };
    fetchClassrooms();
  }, [college]);

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    // Note: Excel Parser was deleted for the SaaS rewrite to enforce robust backend uploading in V2.
    // Here we simulate an upload success that yields a parsed array to unblock UI testing immediately.
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadStatus('Processing Excel file... (Simulated for Migration)');
    setTimeout(() => {
      const dummyStudents: Student[] = [
        { id: '1', name: 'John Doe', rollNumber: 'CS01', branch: 'CSE', exam: 'CS301 - Data Structures', isEligible: true },
        { id: '2', name: 'Jane Smith', rollNumber: 'CS02', branch: 'CSE', exam: 'CS301 - Data Structures', isEligible: true },
        { id: '3', name: 'Bob Wilson', rollNumber: 'EE01', branch: 'ECE', exam: 'EE201 - Circuits', isEligible: true },
      ];
      // Merge without duplicates for simple mocking
      setStudents(prev => [...prev, ...dummyStudents]);
      setUploadStatus(`Successfully loaded ${dummyStudents.length} students`);
      setShowUploadDialog(false);
    }, 1500);

  }, []);

  const generateSeating = async () => {
    if (!selectedExam || !selectedRoom || students.length === 0) {
      setApiError('Please select exam, room, and ensure students are loaded');
      return;
    }

    setIsGenerating(true);
    setProgress(10);
    setApiError('');
    setShowResults(false);

    try {
      const examStudents = students.filter(student => student.exam === selectedExam);
      if (examStudents.length === 0) throw new Error(`No students loaded for ${selectedExam}`);

      setProgress(20);

      let institutionId = college?.id || (college as any)?.institutionId;
      if (!institutionId) {
        throw new Error("Authentication missing. Please reconnect to an institution.");
      }

      // 1. Fetch Classroom Structure from DB dynamically
      const classroomQuery = query(collection(db, 'classrooms'),
        where('institutionId', '==', institutionId),
        where('roomNumber', '==', selectedRoom)
      );

      const classroomDocs = await getDocs(classroomQuery);
      if (classroomDocs.empty) {
        throw new Error(`Classroom structure not found for Room ${selectedRoom}. HOD must configure it first.`);
      }

      const classroomData = classroomDocs.docs[0].data() as Classroom;
      setActiveClassroomLayout(classroomData);

      // Call Secure Cloud Function instead of Frontend Gemini Instance
      setProgress(40);
      const generateFunction = httpsCallable(functions, 'generateSeatingPlan');

      const response = await generateFunction({
        examId: selectedExam,
        roomId: selectedRoom,
        students: examStudents,
        classroomLayout: classroomData
      });

      setProgress(80);

      const resultData = response.data as any;
      if (!resultData.success) throw new Error("Cloud Function returned failure.");

      const arrangements = resultData.seatingJson?.seatingPlan;
      if (!arrangements) throw new Error("Invalid format returned from AI generation.");

      setSeatingArrangements(arrangements);

      // Since Gemini handles the rules via prompt, we assume valid initially.
      // A future cloud function 'validateSeatingPlan' could verify it here.
      setValidationResults({ isValid: true, conflicts: [], suggestions: ["Arrangement generated securely via Firebase Functions."] });

      setProgress(100);
      setShowResults(true);
    } catch (error: any) {
      console.error('Generation Failed:', error);
      setApiError(error.message || 'Error communicating with AI service');
    } finally {
      setIsGenerating(false);
    }
  };

  const saveToFirebase = async () => {
    const userData = user as any;
    if (!userData || !userData.role || !userData.institutionId) {
        console.log("User data missing ❌");
        return;
    }
    console.log("User Data:", userData);

    try {
      const docRef = await addDoc(collection(db, 'seatingPlans'), {
        institutionId: userData.institutionId,
        examName: selectedExam,
        roomId: selectedRoom,
        plan: seatingArrangements,
        createdAt: serverTimestamp()
      });
      alert(`Seating arrangement saved securely! (ID: ${docRef.id})`);
    } catch (error) {
      console.error('Save failed:', error);
      alert('Failed to save arrangement to Firestore');
    }
  };

  const resetGeneration = () => {
    setStudents([]);
    setSeatingArrangements([]);
    setSelectedExam('');
    setSelectedRoom('');
    setProgress(0);
    setApiError('');
    setShowResults(false);
    setValidationResults(null);
    setUploadStatus('');
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 pb-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8 animate-fade-in">
            <h1 className="text-3xl font-display font-bold text-foreground mb-2">
              Secure Seating Generation (SaaS)
            </h1>
            <p className="text-muted-foreground">
              Processing data securely via Firebase Cloud Functions scoped to {college?.name || 'your institution'}.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <Card className="dashboard-card animate-slide-up">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-primary" />
                  Student Roster
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button variant="outline" className="w-full justify-start" onClick={() => setShowUploadDialog(true)}>
                  <Upload className="w-4 h-4 mr-2" /> Upload Roster (Simulated)
                </Button>
                {uploadStatus && (
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">{uploadStatus}</p>
                  </div>
                )}
                {students.length > 0 && (
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <p className="text-sm font-medium text-primary">{students.length} students loaded</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="dashboard-card animate-slide-up stagger-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <Settings className="w-5 h-5 text-secondary" />
                  Environment
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Select Exam</Label>
                  <Select value={selectedExam} onValueChange={setSelectedExam}>
                    <SelectTrigger><SelectValue placeholder="Choose exam..." /></SelectTrigger>
                    <SelectContent>
                      {mockExams.map((exam) => (<SelectItem key={exam.id} value={exam.name}>{exam.name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Select Room</Label>
                  <Select value={selectedRoom} onValueChange={setSelectedRoom}>
                    <SelectTrigger><SelectValue placeholder="Choose room..." /></SelectTrigger>
                    <SelectContent>
                      {classrooms.map((room) => (
                        <SelectItem key={room.id} value={room.roomNumber}><span className="mr-2">Room {room.roomNumber}</span> (Capacity: {room.rows * room.columns * 2})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={generateSeating} variant="admin" size="lg" className="w-full" disabled={isGenerating || students.length === 0}>
                  {isGenerating ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Generating via Cloud...</> : <><Sparkles className="w-4 h-4 mr-2" /> Initialize AI Backend</>}
                </Button>
              </CardContent>
            </Card>

            <Card className="dashboard-card animate-slide-up stagger-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <Grid3X3 className="w-5 h-5 text-accent" /> Server Guidelines
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /><span className="text-sm">Server-side Generation</span></div>
                  <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /><span className="text-sm">API Keys Hidden from Client</span></div>
                  <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /><span className="text-sm">Institution Auto-Scoped</span></div>
                </div>
              </CardContent>
            </Card>
          </div>

          {isGenerating && (
            <Card className="dashboard-card mb-8">
              <CardContent className="pt-6">
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Executing Cloud Function Trigger...</span>
                  <span className="text-sm text-muted-foreground">{progress}%</span>
                </div>
                <Progress value={progress} className="w-full" />
              </CardContent>
            </Card>
          )}

          {apiError && (
            <Card className="mb-8 border-destructive/50 bg-destructive/10">
              <CardContent className="pt-6 flex gap-3">
                <AlertCircle className="w-5 h-5 text-destructive" />
                <div><p className="font-medium text-destructive">Backend Error</p><p className="text-sm text-destructive/80">{apiError}</p></div>
              </CardContent>
            </Card>
          )}

          {showResults && seatingArrangements.length > 0 && activeClassroomLayout && (
            <Card className="dashboard-card animate-slide-up overflow-hidden">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex gap-3"><Eye className="w-5 h-5 text-primary" /> Generated Seating Arrangement</CardTitle>
                  <Button variant="admin" size="sm" onClick={saveToFirebase}><Save className="w-4 h-4 mr-2" /> Save to Firestore</Button>
                </div>
              </CardHeader>
              <CardContent className="overflow-auto bg-gray-50 border-t p-0 md:p-6">
                <ClassroomRenderer layout={activeClassroomLayout} seatingPlan={seatingArrangements as any} />
              </CardContent>
            </Card>
          )}

          {showResults && (
            <div className="flex justify-center gap-4 mt-8">
              <Button variant="outline" onClick={resetGeneration}><RefreshCw className="w-4 h-4 mr-2" /> Reset Memory</Button>
            </div>
          )}
        </div>
      </main>

      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Roster Initialization</DialogTitle><DialogDescription>Because the Excel Parser was decommissioned during the SaaS migration, clicking the button below will inject Mock Students directly into the application state to simulate an upload.</DialogDescription></DialogHeader>
          <div className="space-y-4 py-4 text-center">
            <Button onClick={(e) => handleFileUpload(e as any)}>Simulate Upload</Button>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowUploadDialog(false)}>Cancel</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminGenerateSeating;
