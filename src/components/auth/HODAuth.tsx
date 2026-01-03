import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Mail, Lock, Building2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

// Demo colleges
const demoColleges = [
  { id: 'col_1', name: 'Demo Engineering College', code: 'DEC' },
  { id: 'col_2', name: 'ABC Institute of Technology', code: 'AIT' },
];

const demoBranches = [
  { id: 'br_1', name: 'Computer Science', code: 'CS' },
  { id: 'br_2', name: 'Electronics', code: 'EC' },
  { id: 'br_3', name: 'Mechanical', code: 'ME' },
];

export const HODAuth: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  // Sign Up State
  const [selectedCollege, setSelectedCollege] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');

  // Login State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    await new Promise(resolve => setTimeout(resolve, 1500));

    const college = demoColleges.find(c => c.id === selectedCollege)!;
    const branch = demoBranches.find(b => b.id === selectedBranch)!;

    const user = {
      id: 'hod_1',
      email,
      role: 'hod' as const,
      collegeId: selectedCollege,
      branchId: selectedBranch,
      name: `HOD - ${branch.name}`,
    };

    login(user, {
      ...college,
      location: 'Demo City',
      email,
      blocks: 5,
      branches: demoBranches.map(b => ({ ...b, collegeId: selectedCollege })),
      createdAt: new Date(),
    });

    toast({
      title: 'Registration Successful',
      description: 'Your HOD account has been created.',
    });
    navigate('/hod/dashboard');
    setIsLoading(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    await new Promise(resolve => setTimeout(resolve, 1000));

    const college = demoColleges[0];

    const user = {
      id: 'hod_1',
      email: loginEmail,
      role: 'hod' as const,
      collegeId: college.id,
      branchId: 'br_1',
      name: 'HOD - Computer Science',
    };

    login(user, {
      ...college,
      location: 'Demo City',
      email: loginEmail,
      blocks: 5,
      branches: demoBranches.map(b => ({ ...b, collegeId: college.id })),
      createdAt: new Date(),
    });

    toast({
      title: 'Login Successful',
      description: 'Welcome back!',
    });
    navigate('/hod/dashboard');
    setIsLoading(false);
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
            HOD Panel
          </h1>
          <p className="text-muted-foreground">
            Manage your department's data
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
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">College Email</Label>
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
                    />
                  </div>
                </div>

                <Button type="submit" variant="hod" size="lg" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Signing in...' : 'Sign In'}
                </Button>
              </form>
            </TabsContent>

            {/* Sign Up Tab */}
            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label>Select College</Label>
                  <Select value={selectedCollege} onValueChange={setSelectedCollege} required>
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
                  <Label htmlFor="email">College Email</Label>
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
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Assigned Branch</Label>
                  <Select value={selectedBranch} onValueChange={setSelectedBranch} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select branch" />
                    </SelectTrigger>
                    <SelectContent>
                      {demoBranches.map(branch => (
                        <SelectItem key={branch.id} value={branch.id}>
                          {branch.name} ({branch.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button type="submit" variant="hod" size="lg" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Registering...' : 'Register'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};
