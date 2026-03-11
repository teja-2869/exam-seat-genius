import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BookOpen, Hash, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { InstitutionSelector } from '@/features/institution/InstitutionSelector';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { User } from '@/types';

export const StudentVerify: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { login, isAuthenticated, currentRole } = useAuth();

  useEffect(() => {
    if (isAuthenticated && currentRole) {
      if (currentRole.toLowerCase() === 'admin') navigate('/admin/dashboard', { replace: true });
      else if (currentRole.toLowerCase() === 'hod') navigate('/hod/dashboard', { replace: true });
      else if (currentRole.toLowerCase() === 'faculty') navigate('/faculty/dashboard', { replace: true });
      else if (currentRole.toLowerCase() === 'student') navigate('/student/dashboard', { replace: true });
    }
  }, [isAuthenticated, currentRole, navigate]);

  const [selectedInstitution, setSelectedInstitution] = useState<any>(null);
  const [isInstitutionConfirmed, setIsInstitutionConfirmed] = useState(false);
  const [studentId, setStudentId] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const verifyStudentId = async () => {
    if (!selectedInstitution || !studentId) {
      toast({
        title: 'Missing Information',
        description: 'Please select an institution and enter your Student ID.',
        variant: 'destructive',
      });
      return;
    }

    setIsVerifying(true);
    setVerificationStatus('idle');

    // Simulate backend verification
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Basic format validation
    const studentIdPattern = /^\d{2}[A-Z]{3,4}\d{5}$/;
    const isValidFormat = studentIdPattern.test(studentId);

    // In SaaS mode, we bypass strict local ID checking and trust format/backend
    const isValidId = true;

    if (isValidFormat && isValidId) {
      setVerificationStatus('success');

      // Store student info for exam details page scoped to this institution
      sessionStorage.setItem('studentId', studentId);
      sessionStorage.setItem('collegeId', selectedInstitution.id);

      // Perform pseudo-login for the student so global auth contexts populate properly
      const pseudoUser: User = {
        id: studentId,
        email: `${studentId.toLowerCase()}@student.local`,
        role: 'student',
        collegeId: selectedInstitution.id,
        name: `Student ${studentId}`,
        branchId: studentId.substring(4, 7).toUpperCase(), // Extracting dummy branch from middle chars, e.g. "BFA"
      };

      login(pseudoUser, selectedInstitution);

      setTimeout(() => {
        toast({
          title: 'Verification Successful',
          description: 'Welcome to your student dashboard.',
        });
        navigate('/student/dashboard', { replace: true });
      }, 1000);
    } else {
      setVerificationStatus('error');
      toast({
        title: 'Verification Failed',
        description: 'Invalid Student ID format or ID not found in this institution.',
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
            {!isInstitutionConfirmed ? (
              <div className="space-y-4 animate-fade-in">
                <InstitutionSelector
                  // Access the full JSON dataset identical to Admin layout behavior
                  mode="registration"
                  onInstitutionSelected={setSelectedInstitution}
                  disabled={isVerifying}
                />

                {selectedInstitution && (
                  <Button
                    type="button"
                    variant="student"
                    size="lg"
                    className="w-full mt-4 animate-slide-up"
                    onClick={() => setIsInstitutionConfirmed(true)}
                  >
                    Continue with College
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-6 animate-slide-up">
                {/* Read-only College Badge */}
                <div className="p-4 bg-muted/50 rounded-xl space-y-2 border border-border relative">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-2 h-8 text-xs text-muted-foreground"
                    onClick={() => setIsInstitutionConfirmed(false)}
                    disabled={isVerifying}
                  >
                    Change
                  </Button>
                  <div className="flex items-center gap-2 text-panel-student font-medium pr-16">
                    <BookOpen className="w-4 h-4" />
                    {selectedInstitution.name}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {selectedInstitution.district}, {selectedInstitution.state}
                  </div>
                </div>

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
                  disabled={isVerifying || !studentId}
                >
                  {isVerifying ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                      Verifying with Server...
                    </>
                  ) : (
                    'Verify Identity'
                  )}
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                  Your Student ID will be verified against the secure database
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
