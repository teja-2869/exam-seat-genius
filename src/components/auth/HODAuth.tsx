import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Users, Mail, Lock, Building2, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { auth, db } from '@/lib/firebase';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

export const HODAuth: React.FC = () => {
  const navigate = useNavigate();
  const { login, suppressAutoLogin } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  // Login State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [branchName, setBranchName] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      suppressAutoLogin.current = true;
      const userCredential = await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
      
      const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
      if (!userDoc.exists()) throw new Error('User not found in database');
      const userData = userDoc.data() as any;

      if (userData.role !== 'HOD' && userData.role !== 'hod') {
        throw new Error('Insufficient permissions. You are not an HOD.');
      }

      // Exact match for branch case-sensitive or insensitive? Let's do exact since it's an internal system
      if (userData.branch !== branchName) {
        throw new Error('Branch mismatch! This branch does not match your assigned branch.');
      }

      const collegeDoc = await getDoc(doc(db, 'institutions', userData.institutionId));
      const college = collegeDoc.exists() ? collegeDoc.data() : { id: userData.institutionId, name: userData.institutionName };

      login(userData, college as any);
      toast({
        title: 'Login Successful',
        description: 'Welcome back to the HOD Panel!',
      });
      navigate('/hod/dashboard', { replace: true });
    } catch (error: any) {
      console.error(error);
      if (auth.currentUser) await signOut(auth);
      toast({
        title: 'Login Failed',
        description: error.message || 'Invalid credentials or branch mismatch.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6 pt-24">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="w-20 h-20 rounded-2xl bg-secondary/20 flex items-center justify-center mx-auto mb-4">
            <Users className="w-10 h-10 text-secondary" />
          </div>
          <h1 className="text-3xl font-display font-bold text-foreground mb-2">
            HOD Portal
          </h1>
          <p className="text-muted-foreground">
            Sign in to manage your branch infrastructure
          </p>
        </div>

        {/* Auth Form */}
        <div className="glass-card p-8 animate-slide-up">
          <form onSubmit={handleLogin} className="space-y-6 animate-fade-in">
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

            <div className="space-y-2">
              <Label htmlFor="branch-name">Branch Name</Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="branch-name"
                  type="text"
                  placeholder="e.g. CSE(CYBER)"
                  className="pl-11"
                  value={branchName}
                  onChange={(e) => setBranchName(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
              <p className="text-xs text-muted-foreground">This must match your registered branch verbatim.</p>
            </div>

            <Button type="submit" variant="hod" size="lg" className="w-full" disabled={isLoading}>
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
              Sign In
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};
