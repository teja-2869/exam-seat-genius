import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ShieldCheck, Building2, MapPin, Mail, Lock, Hash, GitBranch, Plus, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface BranchInput {
  name: string;
  code: string;
}

export const AdminAuth: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  // Sign Up State
  const [collegeName, setCollegeName] = useState('');
  const [collegeCode, setCollegeCode] = useState('');
  const [location, setLocation] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [blocks, setBlocks] = useState('');
  const [branches, setBranches] = useState<BranchInput[]>([{ name: '', code: '' }]);

  // Login State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const addBranch = () => {
    setBranches([...branches, { name: '', code: '' }]);
  };

  const removeBranch = (index: number) => {
    if (branches.length > 1) {
      setBranches(branches.filter((_, i) => i !== index));
    }
  };

  const updateBranch = (index: number, field: 'name' | 'code', value: string) => {
    const updated = [...branches];
    updated[index][field] = value;
    setBranches(updated);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Simulate registration
    await new Promise(resolve => setTimeout(resolve, 1500));

    const college = {
      id: 'col_1',
      name: collegeName,
      code: collegeCode,
      location,
      email,
      blocks: parseInt(blocks),
      branches: branches.map((b, i) => ({ id: `br_${i}`, ...b, collegeId: 'col_1' })),
      createdAt: new Date(),
    };

    const user = {
      id: 'admin_1',
      email,
      role: 'admin' as const,
      collegeId: 'col_1',
      name: 'Admin',
    };

    login(user, college);
    toast({
      title: 'Registration Successful',
      description: 'Your college has been registered successfully.',
    });
    navigate('/admin/dashboard');
    setIsLoading(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Simulate login
    await new Promise(resolve => setTimeout(resolve, 1000));

    const college = {
      id: 'col_1',
      name: 'Demo Engineering College',
      code: 'DEC',
      location: 'Demo City',
      email: loginEmail,
      blocks: 5,
      branches: [
        { id: 'br_1', name: 'Computer Science', code: 'CS', collegeId: 'col_1' },
        { id: 'br_2', name: 'Electronics', code: 'EC', collegeId: 'col_1' },
      ],
      createdAt: new Date(),
    };

    const user = {
      id: 'admin_1',
      email: loginEmail,
      role: 'admin' as const,
      collegeId: 'col_1',
      name: 'Admin',
    };

    login(user, college);
    toast({
      title: 'Login Successful',
      description: 'Welcome back!',
    });
    navigate('/admin/dashboard');
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6 pt-24">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="w-20 h-20 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-3xl font-display font-bold text-foreground mb-2">
            Admin Panel
          </h1>
          <p className="text-muted-foreground">
            Manage your college examination system
          </p>
        </div>

        {/* Auth Form */}
        <div className="glass-card p-8 animate-slide-up">
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Register College</TabsTrigger>
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
                      placeholder="admin@college.edu"
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

                <Button type="submit" variant="admin" size="lg" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Signing in...' : 'Sign In'}
                </Button>
              </form>
            </TabsContent>

            {/* Sign Up Tab */}
            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="college-name">College Name</Label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        id="college-name"
                        placeholder="ABC Engineering"
                        className="pl-11"
                        value={collegeName}
                        onChange={(e) => setCollegeName(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="college-code">Code</Label>
                    <div className="relative">
                      <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        id="college-code"
                        placeholder="ABC"
                        className="pl-11"
                        value={collegeCode}
                        onChange={(e) => setCollegeCode(e.target.value.toUpperCase())}
                        maxLength={5}
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="location"
                      placeholder="City, State"
                      className="pl-11"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Official Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="admin@college.edu"
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
                </div>

                <div className="space-y-2">
                  <Label htmlFor="blocks">Number of Blocks</Label>
                  <Input
                    id="blocks"
                    type="number"
                    placeholder="10"
                    value={blocks}
                    onChange={(e) => setBlocks(e.target.value)}
                    min="1"
                    required
                  />
                </div>

                {/* Branches */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Branches</Label>
                    <Button type="button" variant="ghost" size="sm" onClick={addBranch}>
                      <Plus className="w-4 h-4 mr-1" /> Add Branch
                    </Button>
                  </div>

                  {branches.map((branch, index) => (
                    <div key={index} className="flex gap-2 items-center">
                      <div className="relative flex-1">
                        <GitBranch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          placeholder="Branch Name"
                          className="pl-10"
                          value={branch.name}
                          onChange={(e) => updateBranch(index, 'name', e.target.value)}
                          required
                        />
                      </div>
                      <Input
                        placeholder="Code"
                        className="w-24"
                        value={branch.code}
                        onChange={(e) => updateBranch(index, 'code', e.target.value.toUpperCase())}
                        maxLength={4}
                        required
                      />
                      {branches.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeBranch(index)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                <Button type="submit" variant="admin" size="lg" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Registering...' : 'Register College'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};
