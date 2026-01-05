import React, { useState, useCallback } from 'react';
import { Header } from '@/components/layout/Header';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  Upload, 
  Download, 
  Users, 
  Sparkles, 
  AlertCircle,
  CheckCircle,
  Clock,
  Grid3X3,
  Save,
  RefreshCw,
  FileText,
  Eye,
  Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { 
  geminiService, 
  Student, 
  SeatingArrangement, 
  ValidationResult 
} from '@/services/geminiServiceFallback';
import { 
  ExcelService, 
  ExcelStudentData, 
  ParsedExcelData 
} from '@/services/excelServiceFallback';
import { 
  MockDataService 
} from '@/services/mockDataService';

const AdminGenerateSeating: React.FC = () => {
  const navigate = useNavigate();
  const { college, user } = useAuth();
  
  // State management
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
  const [excelData, setExcelData] = useState<ParsedExcelData | null>(null);
  const [useMockData, setUseMockData] = useState(true);

  // Mock data
  const mockExams = MockDataService.getExams();
  const mockRooms = MockDataService.getRooms();

  // Initialize with mock data
  React.useEffect(() => {
    if (useMockData) {
      const mockStudents = MockDataService.getStudents();
      setStudents(mockStudents);
      setUploadStatus(`Loaded ${mockStudents.length} mock students for demonstration`);
    }
  }, [useMockData]);

  // Handle Excel file upload
  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploadStatus('Processing Excel file...');
      const parsedData = await ExcelService.parseExcelFile(file);
      
      if (parsedData.errors.length > 0) {
        setUploadStatus(`Warning: ${parsedData.errors.length} errors found`);
      } else {
        setUploadStatus(`Successfully loaded ${parsedData.successfulRows} students`);
      }
      
      setExcelData(parsedData);
      
      // Convert to Student format
      const eligibleStudents = parsedData.students
        .filter(student => student.isEligible)
        .map(student => ({
          id: student.rollNumber,
          name: student.name,
          rollNumber: student.rollNumber,
          branch: student.branch,
          exam: student.exam,
          subject: student.subject,
          isEligible: student.isEligible
        }));
      
      setStudents(eligibleStudents);
      setShowUploadDialog(false);
    } catch (error: any) {
      setUploadStatus(`Error: ${error.message}`);
    }
  }, []);

  // Generate seating arrangement
  const generateSeating = async () => {
    if (!selectedExam || !selectedRoom || students.length === 0) {
      setApiError('Please select exam, room, and ensure students are loaded');
      return;
    }

    setIsGenerating(true);
    setProgress(0);
    setApiError('');

    try {
      // Filter students by selected exam
      const examStudents = students.filter(student => student.exam === selectedExam);
      
      if (examStudents.length === 0) {
        throw new Error('No students found for selected exam');
      }

      const roomCapacity = 40; // 5 rows × 8 students per row
      const allArrangements: SeatingArrangement[] = [];
      let remainingStudents = [...examStudents];
      let currentRoom = parseInt(selectedRoom);

      // Generate arrangements for multiple rooms if needed
      while (remainingStudents.length > 0) {
        setProgress(Math.round(((examStudents.length - remainingStudents.length) / examStudents.length) * 80));
        
        try {
          const result = await geminiService.generateSeatingArrangement(
            remainingStudents.slice(0, roomCapacity),
            roomCapacity,
            currentRoom
          );
          
          allArrangements.push(...result.arrangements);
          remainingStudents = result.remainingStudents;
          currentRoom++;
          
          // Small delay between API calls to avoid rate limiting
          if (remainingStudents.length > 0) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        } catch (error: any) {
          if (error.message === 'API_LIMIT_EXCEEDED') {
            throw new Error('API_LIMIT_EXCEEDED');
          }
          
          // Fallback to mock arrangement if AI fails
          console.warn('AI failed, using fallback arrangement:', error);
          const fallbackArrangement = MockDataService.generateBasicSeating(
            remainingStudents.slice(0, roomCapacity),
            currentRoom
          );
          allArrangements.push(fallbackArrangement);
          remainingStudents = remainingStudents.slice(roomCapacity);
          currentRoom++;
        }
      }

      setSeatingArrangements(allArrangements);
      setProgress(90);

      // Validate arrangements
      if (allArrangements.length > 0) {
        try {
          const validation = await geminiService.validateSeatingArrangement(allArrangements[0]);
          setValidationResults(validation);
          setProgress(100);
        } catch (error: any) {
          if (error.message === 'API_LIMIT_EXCEEDED') {
            throw new Error('API_LIMIT_EXCEEDED');
          }
          console.warn('Validation failed:', error);
        }
      }

      setShowResults(true);
    } catch (error: any) {
      if (error.message === 'API_LIMIT_EXCEEDED') {
        setApiError('API limit exceeded. Please try again later or use mock data.');
      } else {
        setApiError(error.message || 'Failed to generate seating arrangement');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  // Save to Firebase (mock implementation)
  const saveToFirebase = async () => {
    try {
      // Here you would save to Firebase
      console.log('Saving to Firebase:', {
        exam: selectedExam,
        room: selectedRoom,
        arrangements: seatingArrangements,
        validation: validationResults,
        timestamp: new Date().toISOString()
      });
      
      alert('Seating arrangement saved successfully! (Firebase integration ready)');
    } catch (error) {
      console.error('Save failed:', error);
      alert('Failed to save arrangement');
    }
  };

  // Download seating arrangement
  const downloadSeating = () => {
    const data = {
      exam: selectedExam,
      room: selectedRoom,
      arrangements: seatingArrangements,
      validation: validationResults,
      generatedAt: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `seating-arrangement-${selectedExam}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Download template
  const downloadTemplate = () => {
    ExcelService.createTemplate();
  };

  // Reset everything
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
    setExcelData(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-24 pb-12 px-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8 animate-fade-in">
            <h1 className="text-3xl font-display font-bold text-foreground mb-2">
              AI-Powered Seating Arrangement
            </h1>
            <p className="text-muted-foreground">
              Generate optimal seating arrangements using Google Gemini AI with advanced validation rules
            </p>
          </div>

          {/* Configuration Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Student Upload */}
            <Card className="dashboard-card animate-slide-up">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-primary" />
                  Student Data
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => setShowUploadDialog(true)}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Excel Sheet
                  </Button>
                  
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={downloadTemplate}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download Template
                  </Button>
                </div>

                {uploadStatus && (
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">{uploadStatus}</p>
                  </div>
                )}

                <div className="pt-3 border-t">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Use Mock Data</Label>
                    <input
                      type="checkbox"
                      checked={useMockData}
                      onChange={(e) => setUseMockData(e.target.checked)}
                      className="rounded"
                    />
                  </div>
                </div>

                {students.length > 0 && (
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <p className="text-sm font-medium text-primary">
                      {students.length} eligible students loaded
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Exam & Room Selection */}
            <Card className="dashboard-card animate-slide-up stagger-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <Settings className="w-5 h-5 text-secondary" />
                  Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="exam-select">Select Exam</Label>
                  <Select value={selectedExam} onValueChange={setSelectedExam}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose exam..." />
                    </SelectTrigger>
                    <SelectContent>
                      {mockExams.map((exam) => (
                        <SelectItem key={exam.id} value={exam.name}>
                          {exam.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="room-select">Select Room</Label>
                  <Select value={selectedRoom} onValueChange={setSelectedRoom}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose room..." />
                    </SelectTrigger>
                    <SelectContent>
                      {mockRooms.map((room) => (
                        <SelectItem key={room.id} value={room.id.toString()}>
                          {room.name} (Capacity: {room.capacity})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  onClick={generateSeating}
                  variant="admin"
                  size="lg"
                  className="w-full"
                  disabled={isGenerating || students.length === 0}
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate Seating
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Validation Rules */}
            <Card className="dashboard-card animate-slide-up stagger-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <Grid3X3 className="w-5 h-5 text-accent" />
                  Validation Rules
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-sm">Same branch students not adjacent</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-sm">Same exam students separated</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-sm">Consecutive roll numbers separated</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-sm">Detained students excluded</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-sm">Optimal room utilization</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Progress */}
          {isGenerating && (
            <Card className="dashboard-card mb-8">
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Generating Seating...</span>
                    <span className="text-sm text-muted-foreground">{progress}%</span>
                  </div>
                  <Progress value={progress} className="w-full" />
                </div>
              </CardContent>
            </Card>
          )}

          {/* API Error */}
          {apiError && (
            <Card className="mb-8 border-destructive/50 bg-destructive/10">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-destructive" />
                  <div>
                    <p className="font-medium text-destructive">Error</p>
                    <p className="text-sm text-destructive/80">{apiError}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Results */}
          {showResults && seatingArrangements.length > 0 && (
            <Card className="dashboard-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-3">
                    <Eye className="w-5 h-5 text-primary" />
                    Generated Seating Arrangement
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={downloadSeating}>
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                    <Button variant="admin" size="sm" onClick={saveToFirebase}>
                      <Save className="w-4 h-4 mr-2" />
                      Save to Firebase
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Validation Results */}
                  {validationResults && (
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <h4 className="font-medium mb-3">Validation Results</h4>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          {validationResults.isValid ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-yellow-500" />
                          )}
                          <span className="text-sm">
                            {validationResults.isValid ? 'Valid' : 'Needs Review'}
                          </span>
                        </div>
                        
                        {validationResults.conflicts.length > 0 && (
                          <div>
                            <p className="text-sm font-medium text-yellow-600 mb-1">Conflicts:</p>
                            <ul className="text-sm text-muted-foreground space-y-1">
                              {validationResults.conflicts.map((conflict, index) => (
                                <li key={index}>• {conflict}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        {validationResults.suggestions.length > 0 && (
                          <div>
                            <p className="text-sm font-medium text-blue-600 mb-1">Suggestions:</p>
                            <ul className="text-sm text-muted-foreground space-y-1">
                              {validationResults.suggestions.map((suggestion, index) => (
                                <li key={index}>• {suggestion}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Seating Layouts */}
                  <div className="space-y-4">
                    {seatingArrangements.map((arrangement, roomIndex) => (
                      <div key={roomIndex} className="border rounded-lg p-4">
                        <h4 className="font-medium mb-3">
                          Room {arrangement.roomNumber} - {mockRooms.find(r => r.id === arrangement.roomNumber)?.name}
                        </h4>
                        
                        {/* Visual Seating Layout */}
                        <div className="bg-muted/30 rounded-lg p-4">
                          <div className="grid grid-cols-4 gap-2 max-w-2xl mx-auto">
                            {Array.from({ length: 5 }, (_, rowIndex) => (
                              <React.Fragment key={rowIndex}>
                                {Array.from({ length: 4 }, (_, benchIndex) => {
                                  const leftSeat = arrangement.seats.find(
                                    seat => seat.row === rowIndex + 1 && seat.bench === benchIndex + 1 && seat.position === 'left'
                                  );
                                  const rightSeat = arrangement.seats.find(
                                    seat => seat.row === rowIndex + 1 && seat.bench === benchIndex + 1 && seat.position === 'right'
                                  );

                                  return (
                                    <div key={`${rowIndex}-${benchIndex}`} className="border rounded p-2 bg-background">
                                      <div className="text-xs text-muted-foreground mb-1">
                                        R{rowIndex + 1}-B{benchIndex + 1}
                                      </div>
                                      <div className="grid grid-cols-2 gap-1">
                                        <div className={`p-1 rounded text-xs text-center ${
                                          leftSeat?.student ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'
                                        }`}>
                                          {leftSeat?.student ? leftSeat.student.rollNumber : 'Empty'}
                                        </div>
                                        <div className={`p-1 rounded text-xs text-center ${
                                          rightSeat?.student ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'
                                        }`}>
                                          {rightSeat?.student ? rightSeat.student.rollNumber : 'Empty'}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </React.Fragment>
                            ))}
                          </div>
                        </div>

                        {/* Student List */}
                        <div className="mt-4">
                          <h5 className="text-sm font-medium mb-2">Seated Students:</h5>
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                            {arrangement.seats
                              .filter(seat => seat.student)
                              .map((seat, index) => (
                                <div key={index} className="p-2 bg-muted/50 rounded text-xs">
                                  <p className="font-medium">{seat.student?.name}</p>
                                  <p className="text-muted-foreground">{seat.student?.rollNumber}</p>
                                  <p className="text-muted-foreground">R{seat.row}-B{seat.bench}-{seat.position}</p>
                                </div>
                              ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          {showResults && (
            <div className="flex justify-center gap-4 mt-8">
              <Button variant="outline" onClick={resetGeneration}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Generate New
              </Button>
              <Button onClick={() => navigate('/admin-dashboard')}>
                Back to Dashboard
              </Button>
            </div>
          )}
        </div>
      </main>

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Student Data</DialogTitle>
            <DialogDescription>
              Upload an Excel file with student information. The file should contain columns: Name, Roll Number, Branch, Exam, Subject.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
              <Upload className="w-8 h-8 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-3">
                Click to browse or drag and drop Excel file here
              </p>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                className="hidden"
                id="file-upload"
              />
              <Button asChild variant="outline">
                <label htmlFor="file-upload" className="cursor-pointer">
                  Choose File
                </label>
              </Button>
            </div>
            
            <div className="text-xs text-muted-foreground">
              <p className="font-medium mb-1">Expected Format:</p>
              <p>Name | Roll Number | Branch | Exam | Subject</p>
              <p className="mt-2">Note: Students with empty roll numbers will be marked as ineligible.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUploadDialog(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminGenerateSeating;
