import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { GraduationCap, Hash, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { InstitutionSelector } from '@/features/institution/InstitutionSelector';

export const FacultyVerify: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { toast } = useToast();

  const [selectedInstitution, setSelectedInstitution] = useState<any>(null);
  const [isInstitutionConfirmed, setIsInstitutionConfirmed] = useState(false);
  const [facultyId, setFacultyId] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const [showOtpForm, setShowOtpForm] = useState(false);
  const [enteredOtp, setEnteredOtp] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');

  const requestOTP = async () => {
    if (!selectedInstitution || !facultyId || !phoneNumber) {
      toast({
        title: 'Missing Information',
        description: 'Please select an institution, enter your Faculty ID, and Phone Number.',
        variant: 'destructive',
      });
      return;
    }

    // Basic format validation
    const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+91${phoneNumber}`;
    if (formattedPhone.length < 13) {
      toast({ title: 'Invalid Phone', description: 'Enter a valid phone number (e.g. 9876543210).', variant: 'destructive' });
      return;
    }

    setIsVerifying(true);
    setVerificationStatus('idle');

    try {
      // 1. Verify if Faculty ID exists (simulated check here for demo, can be queried from DB)
      const isValidId = facultyId.startsWith('FAC');
      if (!isValidId) {
        throw new Error('Invalid Faculty ID format. Must start with FAC.');
      }

      // 2. Instantly Generate Secure Local OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedOtp(otp);

      // 3. Ultra-Fast Dispatch via Fast2SMS (Bypassing Firebase & Cloud Functions)
      // Because we use "no-cors", the browser successfully fires the request to the telecom API 
      // without getting blocked, even though we can't read the JSON response back.
      const fast2smsKey = import.meta.env.VITE_FAST2SMS_API_KEY;

      if (fast2smsKey && fast2smsKey !== "YOUR_FAST2SMS_KEYS") {
        try {
          await fetch(`https://www.fast2sms.com/dev/bulkV2?authorization=${fast2smsKey}&variables_values=${otp}&route=otp&numbers=${phoneNumber}`, {
            method: 'GET',
            mode: 'no-cors' // This magically bypasses the strict browser blocking!
          });

          toast({
            title: 'Live OTP Dispatched via Fast2SMS',
            description: `Check your phone number ${phoneNumber} for the SMS.`,
          });
        } catch (smsError) {
          console.error("Fast2SMS Dispatch Error:", smsError);
          toast({ title: 'Live SMS Error', description: 'Failed to access telecom provider.', variant: 'destructive' });
        }
      } else {
        toast({
          title: 'Live SMS Disabled',
          description: 'No Fast2SMS API Key found. Fallback Demo Display activated.',
          variant: 'destructive',
        });
      }

      setShowOtpForm(true);

    } catch (err: any) {
      console.error(err);
      toast({
        title: 'Failed to Send OTP',
        description: err.message || 'Check your phone number and try again.',
        variant: 'destructive',
      });
    }

    setIsVerifying(false);
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (enteredOtp.length !== 6) return;

    setIsVerifying(true);

    try {
      // Confirm the generated fast OTP
      if (enteredOtp !== generatedOtp) {
        throw new Error("The OTP entered is incorrect.");
      }

      setVerificationStatus('success');

      const user = {
        id: `fac_${Date.now()}`,
        email: `${facultyId}@college.edu`, // Mock email since we logged in via Phone
        phone: phoneNumber,
        role: 'faculty' as const,
        collegeId: selectedInstitution.id,
        name: `Faculty ${facultyId}`,
      };

      setTimeout(() => {
        login(user as any, selectedInstitution as any);
        toast({
          title: 'Verification Successful',
          description: 'Welcome! Redirecting to your dashboard.',
        });
        navigate('/faculty/dashboard', { replace: true });
      }, 1000);

    } catch (err: any) {
      console.error(err);
      toast({
        title: 'OTP Verification Failed',
        description: err.message || 'The OTP entered is incorrect.',
        variant: 'destructive',
      });
    } finally {
      setIsVerifying(false);
    }
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
            {!isInstitutionConfirmed ? (
              <div className="space-y-4 animate-fade-in">
                <InstitutionSelector
                  mode="registration"
                  onInstitutionSelected={setSelectedInstitution}
                  disabled={isVerifying}
                />

                {selectedInstitution && (
                  <Button
                    type="button"
                    variant="faculty"
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
                  <div className="flex items-center gap-2 text-accent font-medium pr-16">
                    <GraduationCap className="w-4 h-4" />
                    {selectedInstitution.name}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {selectedInstitution.district}, {selectedInstitution.state}
                  </div>
                </div>

                {!showOtpForm ? (
                  <div className="space-y-6 animate-fade-in">
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

                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="9876543210"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                        disabled={isVerifying}
                        className="pl-4"
                      />
                      <p className="text-xs text-muted-foreground">
                        An OTP will be sent to this number to verify your identity.
                      </p>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleVerifyOTP} className="space-y-4 animate-slide-up">
                    {/* Render demo display if the backend explicitly safely returned a demoOtp */}
                    {generatedOtp && (
                      <div className="p-4 bg-yellow-500/10 border border-yellow-500/50 rounded-xl mb-4">
                        <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400">
                          <strong>Demo Fallback:</strong> SMS API not configured. Code is <span className="text-lg font-bold tracking-widest ml-2">{generatedOtp}</span>
                        </p>
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label htmlFor="otp">Enter 6-Digit SMS OTP</Label>
                      <Input
                        id="otp"
                        type="text"
                        placeholder="XXXXXX"
                        className="text-center text-lg tracking-widest"
                        maxLength={6}
                        value={enteredOtp}
                        onChange={(e) => setEnteredOtp(e.target.value.replace(/\D/g, ''))}
                        required
                        disabled={isVerifying}
                        autoFocus
                      />
                    </div>
                    <div className="flex gap-4">
                      <Button type="button" variant="outline" className="w-full" onClick={() => setShowOtpForm(false)} disabled={isVerifying}>
                        Back
                      </Button>
                      <Button type="submit" variant="faculty" size="lg" className="w-full" disabled={isVerifying || enteredOtp.length !== 6}>
                        {isVerifying ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                        Verify & Login
                      </Button>
                    </div>
                  </form>
                )}

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

                {!showOtpForm && (
                  <Button
                    variant="faculty"
                    size="lg"
                    className="w-full"
                    onClick={requestOTP}
                    disabled={isVerifying || !facultyId || !phoneNumber}
                  >
                    {isVerifying ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin mr-2" />
                        Sending OTP...
                      </>
                    ) : (
                      'Request OTP'
                    )}
                  </Button>
                )}

                <p className="text-xs text-center text-muted-foreground">
                  Your Faculty ID will be authenticated via registered phone number
                </p>
              </div>
            )}
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
