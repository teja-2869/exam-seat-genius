import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Header } from '@/components/layout/Header';
import { Calendar, BookOpen, ClipboardList, Search, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const examTypes = ['Internal', 'External'];
const semesters = [1, 2, 3, 4, 5, 6, 7, 8];
const years = [2024, 2025, 2026];
const subjects = [
  { code: 'CS301', name: 'Data Structures' },
  { code: 'CS302', name: 'Database Management' },
  { code: 'CS303', name: 'Operating Systems' },
  { code: 'CS304', name: 'Computer Networks' },
];

const StudentExamDetails: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [examType, setExamType] = useState('');
  const [semester, setSemester] = useState('');
  const [year, setYear] = useState('');
  const [subject, setSubject] = useState('');
  const [examDate, setExamDate] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const studentId = sessionStorage.getItem('studentId') || '24BFA33001';

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!examType || !semester || !year || !subject || !examDate) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all exam details.',
        variant: 'destructive',
      });
      return;
    }

    setIsSearching(true);

    // Simulate fetching seating info
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Store exam details
    sessionStorage.setItem('examDetails', JSON.stringify({
      examType,
      semester,
      year,
      subject,
      examDate,
    }));

    toast({
      title: 'Seat Found!',
      description: 'Loading your seating arrangement...',
    });

    navigate('/student/seat-view');
    setIsSearching(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-24 pb-12 px-6">
        <div className="max-w-lg mx-auto">
          {/* Header */}
          <div className="text-center mb-8 animate-fade-in">
            <div className="w-16 h-16 rounded-2xl bg-panel-student/20 flex items-center justify-center mx-auto mb-4">
              <ClipboardList className="w-8 h-8 text-panel-student" />
            </div>
            <h1 className="text-2xl font-display font-bold text-foreground mb-2">
              Exam Details
            </h1>
            <p className="text-muted-foreground">
              Enter your exam information to find your seat
            </p>
            <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-muted rounded-full">
              <span className="text-sm text-muted-foreground">Student ID:</span>
              <span className="text-sm font-semibold text-foreground">{studentId}</span>
            </div>
          </div>

          {/* Form */}
          <div className="glass-card p-8 animate-slide-up">
            <form onSubmit={handleSearch} className="space-y-6">
              {/* Exam Type */}
              <div className="space-y-2">
                <Label>Exam Type</Label>
                <Select value={examType} onValueChange={setExamType}>
                  <SelectTrigger>
                    <ClipboardList className="w-4 h-4 mr-2 text-muted-foreground" />
                    <SelectValue placeholder="Select exam type" />
                  </SelectTrigger>
                  <SelectContent>
                    {examTypes.map(type => (
                      <SelectItem key={type} value={type.toLowerCase()}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Semester & Year */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Semester</Label>
                  <Select value={semester} onValueChange={setSemester}>
                    <SelectTrigger>
                      <SelectValue placeholder="Semester" />
                    </SelectTrigger>
                    <SelectContent>
                      {semesters.map(sem => (
                        <SelectItem key={sem} value={sem.toString()}>
                          Semester {sem}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Year</Label>
                  <Select value={year} onValueChange={setYear}>
                    <SelectTrigger>
                      <SelectValue placeholder="Year" />
                    </SelectTrigger>
                    <SelectContent>
                      {years.map(y => (
                        <SelectItem key={y} value={y.toString()}>
                          {y}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Subject */}
              <div className="space-y-2">
                <Label>Subject</Label>
                <Select value={subject} onValueChange={setSubject}>
                  <SelectTrigger>
                    <BookOpen className="w-4 h-4 mr-2 text-muted-foreground" />
                    <SelectValue placeholder="Select subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map(sub => (
                      <SelectItem key={sub.code} value={sub.code}>
                        {sub.code} - {sub.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Exam Date */}
              <div className="space-y-2">
                <Label htmlFor="exam-date">Exam Date</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="exam-date"
                    type="date"
                    className="pl-11"
                    value={examDate}
                    onChange={(e) => setExamDate(e.target.value)}
                  />
                </div>
              </div>

              <Button
                type="submit"
                variant="student"
                size="lg"
                className="w-full"
                disabled={isSearching}
              >
                {isSearching ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    Finding Your Seat...
                  </>
                ) : (
                  <>
                    <Search className="w-5 h-5 mr-2" />
                    Find My Seat
                  </>
                )}
              </Button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
};

export default StudentExamDetails;
