import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BookOpen, Hash, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { StateSelect } from '@/components/common/StateSelect';
import { CollegeSelect } from '@/components/common/CollegeSelect';
import { getCollegeById } from '@/data/states-colleges';
import { useToast } from '@/hooks/use-toast';


export const StudentVerify: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [selectedState, setSelectedState] = useState('');
  const [selectedCollege, setSelectedCollege] = useState('');
  const [studentId, setStudentId] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Reset college when state changes
  const handleStateChange = (stateCode: string) => {
    setSelectedState(stateCode);
    setSelectedCollege('');
  };

  const verifyStudentId = async () => {
    if (!selectedState || !selectedCollege || !studentId) {
      toast({
        title: 'Missing Information',
        description: 'Please select a state, college, and enter your Student ID.',
        variant: 'destructive',
      });
      return;
    }

    setIsVerifying(true);
    setVerificationStatus('idle');

    // Simulate AI verification with Gemini
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Check student ID format: Year (2 digits) + Branch Code (3-4 chars) + Roll Number (5 digits)
    const studentIdPattern = /^\d{2}[A-Z]{3,4}\d{5}$/;
    const isValidFormat = studentIdPattern.test(studentId);
    const isValidId = true; // Remove demo ID restriction

    if (isValidFormat && isValidId) {
      setVerificationStatus('success');
      
      const college = getCollegeById(selectedCollege);
      
      // Store student info for exam details page
      sessionStorage.setItem('studentId', studentId);
      sessionStorage.setItem('collegeId', selectedCollege);
      sessionStorage.setItem('stateCode', selectedState);
      
      setTimeout(() => {
        toast({
          title: 'Verification Successful',
          description: 'Please enter your exam details.',
        });
        navigate('/student/exam-details');
      }, 1000);
    } else {
      setVerificationStatus('error');
      toast({
        title: 'Verification Failed',
        description: 'Invalid Student ID or ID not found in this college.',
        variant: 'destructive',
      });
    }

    setIsVerifying(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6 pt-24">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="w-20 h-20 rounded-2xl bg-panel-student/20 flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-10 h-10 text-panel-student" />
          </div>
          <h1 className="text-3xl font-display font-bold text-foreground mb-2">
            Student Panel
          </h1>
          <p className="text-muted-foreground">
            Find your exam seat instantly
          </p>
        </div>

        {/* Verification Form */}
        <div className="glass-card p-8 animate-slide-up">
          <div className="space-y-6">
            <StateSelect
              value={selectedState}
              onChange={handleStateChange}
              disabled={isVerifying}
            />

            <CollegeSelect
              value={selectedCollege}
              onChange={setSelectedCollege}
              stateCode={selectedState}
              disabled={isVerifying}
            />

            <div className="space-y-2">
              <Label htmlFor="student-id">Student ID</Label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="student-id"
                  placeholder="e.g., 24BFA33001"
                  className="pl-11 uppercase"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value.toUpperCase())}
                  disabled={isVerifying}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Format: Year + Branch + Roll Number (e.g., 24BFA33001)
              </p>
            </div>

            {/* Verification Status */}
            {verificationStatus === 'success' && (
              <div className="flex items-center gap-2 p-4 bg-secondary/10 rounded-xl text-secondary animate-fade-in">
                <CheckCircle2 className="w-5 h-5" />
                <span className="font-medium">Verified! Loading exam details...</span>
              </div>
            )}

            {verificationStatus === 'error' && (
              <div className="flex items-center gap-2 p-4 bg-destructive/10 rounded-xl text-destructive animate-fade-in">
                <XCircle className="w-5 h-5" />
                <span className="font-medium">Verification failed. Please try again.</span>
              </div>
            )}

            <Button
              variant="student"
              size="lg"
              className="w-full"
              onClick={verifyStudentId}
              disabled={isVerifying || !selectedState || !selectedCollege || !studentId}
            >
              {isVerifying ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Verifying with AI...
                </>
              ) : (
                'Verify Identity'
              )}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              Your Student ID will be verified using AI to ensure authenticity
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};
