import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Mail, Lock, Building2, MapPin, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { auth, db } from '@/lib/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { InstitutionSelector } from '@/features/institution/InstitutionSelector';
import emailjs from '@emailjs/browser';

export const HODAuth: React.FC = () => {
  const navigate = useNavigate();
  const { login, suppressAutoLogin } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  // Sign Up State
  const [selectedInstitution, setSelectedInstitution] = useState<any>(null);
  const [showSignupForm, setShowSignupForm] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Login & OTP State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showOtpForm, setShowOtpForm] = useState(false);
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [enteredOtp, setEnteredOtp] = useState('');

  const [draftInstitution, setDraftInstitution] = useState<any>(null);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInstitution) {
      toast({ title: 'Error', description: 'Please select an institution first.', variant: 'destructive' });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: 'Error', description: 'Passwords do not match.', variant: 'destructive' });
      return;
    }

    setIsLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      const user = {
        uid: firebaseUser.uid,
        email,
        role: 'HOD' as const,
        institutionId: selectedInstitution.id,
        institutionName: selectedInstitution.name,
        name: 'HOD',
        createdAt: new Date(),
      };

      // 1. Create the user
      await setDoc(doc(db, 'users', firebaseUser.uid), user);

      // 2. Register the institution (if it was from the JSON dataset, write it to Firestore so it's a valid tenant)
      const instRef = doc(db, 'institutions', selectedInstitution.id);
      const instDoc = await getDoc(instRef);
      if (!instDoc.exists()) {
        await setDoc(instRef, {
          id: selectedInstitution.id,
          name: selectedInstitution.name,
          state: selectedInstitution.state,
          district: selectedInstitution.district,
          university: selectedInstitution.university || '',
          collegeCode: selectedInstitution.collegeCode || '',
          verificationStatus: 'verified', // Verify instantly for demo
          createdAt: new Date()
        });
      }

      login(user as any, selectedInstitution as any);

      toast({
        title: 'Registration Successful',
        description: 'Your HOD account for ' + selectedInstitution.name + ' has been created.',
      });
      navigate('/hod/dashboard', { replace: true });
    } catch (error: any) {
      console.error(error);
      toast({
        title: 'Registration Failed',
        description: error.message || 'An error occurred.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const requestOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // 1. Verify credentials by attempting a hidden signin
      await signInWithEmailAndPassword(auth, loginEmail, loginPassword);

      // 2. Ensure they are actually an HOD
      const userDoc = await getDoc(doc(db, 'users', auth.currentUser!.uid));
      if (!userDoc.exists()) throw new Error('User not found in database');
      const userData = userDoc.data() as any;

      if (userData.role !== 'HOD' && userData.role !== 'hod') {
        throw new Error('Insufficient permissions. You are not an HOD.');
      }

      // 3. Prevent AuthContext from auto-routing by immediately signing out
      await signOut(auth);

      // 4. Generate OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();

      try {
        // Send actual email via EmailJS
        // Note: Make sure your .env contains VITE_EMAILJS_SERVICE_ID, VITE_EMAILJS_TEMPLATE_ID, VITE_EMAILJS_PUBLIC_KEY
        await emailjs.send(
          import.meta.env.VITE_EMAILJS_SERVICE_ID || 'default_service',
          import.meta.env.VITE_EMAILJS_TEMPLATE_ID || 'default_template',
          {
            to_email: loginEmail,
            otp: otp,
            role: 'HOD'
          },
          import.meta.env.VITE_EMAILJS_PUBLIC_KEY || 'default_public_key'
        );

        setGeneratedOtp(otp);
        setShowOtpForm(true);

        toast({
          title: 'OTP Sent Successfully',
          description: `Check the inbox of ${loginEmail} for your code.`,
        });
      } catch (emailErr) {
        console.error("EmailJS Failed:", emailErr);
        throw new Error("Failed to send OTP email. Please ensure EmailJS is configured properly in your .env file or bypass in code.");
      }

    } catch (error: any) {
      console.error(error);
      if (auth.currentUser) await signOut(auth);
      toast({
        title: 'Login Failed',
        description: error.message || 'Invalid email or password.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();

    if (enteredOtp !== generatedOtp) {
      toast({
        title: 'Invalid OTP',
        description: 'The OTP entered is incorrect.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      // Re-authenticate and proceed
      const userCredential = await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
      const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
      const user = userDoc.data() as any;

      const collegeDoc = await getDoc(doc(db, 'institutions', user.institutionId));
      const college = collegeDoc.exists() ? collegeDoc.data() : { id: user.institutionId, name: user.institutionName };

      login(user, college as any);
      toast({
        title: 'Login Successful',
        description: 'Welcome back!',
      });
      navigate('/hod/dashboard', { replace: true });
    } catch (error: any) {
      toast({
        title: 'OTP Verification Failed',
        description: 'An error occurred.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6 pt-24">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="w-20 h-20 rounded-2xl bg-secondary/20 flex items-center justify-center mx-auto mb-4">
            <Users className="w-10 h-10 text-secondary" />
          </div>
          <h1 className="text-3xl font-display font-bold text-foreground mb-2">
            HOD Panel
          </h1>
          <p className="text-muted-foreground">
            Manage your department's data securely
          </p>
        </div>

        {/* Auth Form */}
        <div className="glass-card p-8 animate-slide-up">
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Register</TabsTrigger>
            </TabsList>

            {/* Login Tab */}
            <TabsContent value="login">
              {!showOtpForm ? (
                <form onSubmit={requestOTP} className="space-y-4 animate-fade-in">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">HOD Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="hod@college.edu"
                        className="pl-11"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        required
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        id="login-password"
                        type="password"
                        placeholder="••••••••"
                        className="pl-11"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        required
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  <Button type="submit" variant="hod" size="lg" className="w-full" disabled={isLoading}>
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                    Proceed to OTP
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOTP} className="space-y-4 animate-slide-up">
                  <div className="space-y-2">
                    <Label htmlFor="otp">Enter OTP</Label>
                    <Input
                      id="otp"
                      type="text"
                      placeholder="6-digit OTP"
                      className="text-center text-lg tracking-widest"
                      maxLength={6}
                      value={enteredOtp}
                      onChange={(e) => setEnteredOtp(e.target.value.replace(/\D/g, ''))}
                      required
                      disabled={isLoading}
                      autoFocus
                    />
                  </div>
                  <div className="flex gap-4">
                    <Button type="button" variant="outline" className="w-full" onClick={() => setShowOtpForm(false)} disabled={isLoading}>
                      Back
                    </Button>
                    <Button type="submit" variant="hod" size="lg" className="w-full" disabled={isLoading || enteredOtp.length !== 6}>
                      {isLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                      Verify & Login
                    </Button>
                  </div>
                </form>
              )}
            </TabsContent>

            {/* Sign Up Tab */}
            <TabsContent value="signup">
              {!showSignupForm && (
                <div className="space-y-4 animate-fade-in">
                  <InstitutionSelector mode="registration" onInstitutionSelected={setSelectedInstitution} disabled={isLoading} />

                  {selectedInstitution && (
                    <Button
                      type="button"
                      variant="hod"
                      size="lg"
                      className="w-full mt-4 animate-slide-up"
                      onClick={() => setShowSignupForm(true)}
                    >
                      Continue with College
                    </Button>
                  )}
                </div>
              )}

              {showSignupForm && selectedInstitution && (
                <form onSubmit={handleSignUp} className="space-y-4 animate-slide-up mt-4">

                  {/* Basic Data Read-only */}
                  <div className="p-4 bg-muted/50 rounded-xl space-y-2 border border-border">
                    <div className="flex items-center gap-2 text-secondary font-medium">
                      <Building2 className="w-4 h-4" />
                      {selectedInstitution.name}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="w-4 h-4" />
                      {selectedInstitution.district}, {selectedInstitution.state}
                    </div>
                    {selectedInstitution.university && (
                      <div className="text-sm text-muted-foreground mt-2 border-t border-border/50 pt-2">
                        Affiliated to: {selectedInstitution.university}
                      </div>
                    )}
                  </div>

                  <div className="grid gap-4 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Official HOD Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                        <Input
                          id="email"
                          type="email"
                          placeholder="hod@college.edu"
                          className="pl-11"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          disabled={isLoading}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                        <Input
                          id="password"
                          type="password"
                          placeholder="••••••••"
                          className="pl-11"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          disabled={isLoading}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirm-password">Re-enter Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                        <Input
                          id="confirm-password"
                          type="password"
                          placeholder="••••••••"
                          className="pl-11"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          required
                          disabled={isLoading}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-4 pt-4">
                    <Button type="button" variant="outline" className="w-full" onClick={() => setShowSignupForm(false)} disabled={isLoading}>
                      Change College
                    </Button>
                    <Button type="submit" variant="hod" size="lg" className="w-full" disabled={isLoading}>
                      {isLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                      Register as HOD
                    </Button>
                  </div>
                </form>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};
