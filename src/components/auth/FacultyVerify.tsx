import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GraduationCap, Building2, Hash, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

// Demo colleges
const demoColleges = [
  { id: 'col_1', name: 'Demo Engineering College', code: 'DEC' },
  { id: 'col_2', name: 'ABC Institute of Technology', code: 'AIT' },
];

// Demo valid faculty IDs
const validFacultyIds = ['FACSMP240001', 'FACCS240002', 'FACEC240003'];

export const FacultyVerify: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { toast } = useToast();
  
  const [selectedCollege, setSelectedCollege] = useState('');
  const [facultyId, setFacultyId] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const verifyFacultyId = async () => {
    if (!selectedCollege || !facultyId) {
      toast({
        title: 'Missing Information',
        description: 'Please select a college and enter your Faculty ID.',
        variant: 'destructive',
      });
      return;
    }

    setIsVerifying(true);
    setVerificationStatus('idle');

    // Simulate AI verification with Gemini
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Check faculty ID format: FAC + Branch Code (2-4 chars) + Year (2 digits) + Number (4 digits)
    const facultyIdPattern = /^FAC[A-Z]{2,4}\d{6}$/;
    const isValidFormat = facultyIdPattern.test(facultyId);
    const isValidId = validFacultyIds.includes(facultyId);

    if (isValidFormat && isValidId) {
      setVerificationStatus('success');
      
      const college = demoColleges.find(c => c.id === selectedCollege)!;
      
      const user = {
        id: 'fac_1',
        email: '',
        role: 'faculty' as const,
        collegeId: selectedCollege,
        name: `Faculty ${facultyId}`,
      };

      setTimeout(() => {
        login(user, {
          ...college,
          location: 'Demo City',
          email: 'admin@college.edu',
          blocks: 5,
          branches: [],
          createdAt: new Date(),
        });
        
        toast({
          title: 'Verification Successful',
          description: 'Welcome! Redirecting to your dashboard.',
        });
        navigate('/faculty/dashboard');
      }, 1000);
    } else {
      setVerificationStatus('error');
      toast({
        title: 'Verification Failed',
        description: 'Invalid Faculty ID or ID not found in this college.',
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
          <div className="w-20 h-20 rounded-2xl bg-accent/20 flex items-center justify-center mx-auto mb-4">
            <GraduationCap className="w-10 h-10 text-accent" />
          </div>
          <h1 className="text-3xl font-display font-bold text-foreground mb-2">
            Faculty Panel
          </h1>
          <p className="text-muted-foreground">
            Verify your identity to access invigilation duties
          </p>
        </div>

        {/* Verification Form */}
        <div className="glass-card p-8 animate-slide-up">
          <div className="space-y-6">
            <div className="space-y-2">
              <Label>Select College</Label>
              <Select value={selectedCollege} onValueChange={setSelectedCollege}>
                <SelectTrigger>
                  <Building2 className="w-4 h-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Choose your college" />
                </SelectTrigger>
                <SelectContent>
                  {demoColleges.map(college => (
                    <SelectItem key={college.id} value={college.id}>
                      {college.name} ({college.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="faculty-id">Faculty ID</Label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="faculty-id"
                  placeholder="e.g., FACSMP240001"
                  className="pl-11 uppercase"
                  value={facultyId}
                  onChange={(e) => setFacultyId(e.target.value.toUpperCase())}
                  disabled={isVerifying}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Format: FAC + Branch Code + Year + Number (e.g., FACSMP240001)
              </p>
            </div>

            {/* Verification Status */}
            {verificationStatus === 'success' && (
              <div className="flex items-center gap-2 p-4 bg-secondary/10 rounded-xl text-secondary animate-fade-in">
                <CheckCircle2 className="w-5 h-5" />
                <span className="font-medium">Verified! Redirecting...</span>
              </div>
            )}

            {verificationStatus === 'error' && (
              <div className="flex items-center gap-2 p-4 bg-destructive/10 rounded-xl text-destructive animate-fade-in">
                <XCircle className="w-5 h-5" />
                <span className="font-medium">Verification failed. Please try again.</span>
              </div>
            )}

            <Button
              variant="faculty"
              size="lg"
              className="w-full"
              onClick={verifyFacultyId}
              disabled={isVerifying || !selectedCollege || !facultyId}
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
              Your Faculty ID will be verified using AI to ensure authenticity
            </p>
          </div>
        </div>

        {/* Demo Info */}
        <div className="mt-6 p-4 bg-muted rounded-xl">
          <p className="text-sm text-muted-foreground text-center">
            <strong>Demo IDs:</strong> FACSMP240001, FACCS240002, FACEC240003
          </p>
        </div>
      </div>
    </div>
  );
};
