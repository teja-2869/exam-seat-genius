import React from 'react';
import { Header } from '@/components/layout/Header';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Building2, 
  Users, 
  GraduationCap, 
  ClipboardList,
  Grid3X3,
  UserCheck,
  Bell,
  BarChart3,
  Plus,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const stats = [
  { label: 'Total Students', value: '2,450', icon: Users, color: 'text-primary', bg: 'bg-primary/10' },
  { label: 'Faculty Members', value: '156', icon: GraduationCap, color: 'text-secondary', bg: 'bg-secondary/10' },
  { label: 'Active Exams', value: '12', icon: ClipboardList, color: 'text-accent', bg: 'bg-accent/10' },
  { label: 'Classrooms', value: '48', icon: Building2, color: 'text-panel-student', bg: 'bg-panel-student/10' },
];

const quickActions = [
  { label: 'Create Exam', icon: Plus, description: 'Set up a new examination', variant: 'admin' as const },
  { label: 'Arrange Seating', icon: Grid3X3, description: 'AI-powered seat assignment', variant: 'secondary' as const },
  { label: 'Assign Invigilators', icon: UserCheck, description: 'Manage invigilation duties', variant: 'accent' as const },
  { label: 'Send Notifications', icon: Bell, description: 'Notify students & faculty', variant: 'outline' as const },
];

const recentExams = [
  { name: 'Data Structures - Internal', date: 'Jan 15, 2025', status: 'Published', students: 180 },
  { name: 'Database Management - External', date: 'Jan 18, 2025', status: 'Draft', students: 210 },
  { name: 'Computer Networks - Internal', date: 'Jan 20, 2025', status: 'Published', students: 165 },
];

const AdminDashboard: React.FC = () => {
  const { college, user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-24 pb-12 px-6">
        <div className="max-w-7xl mx-auto">
          {/* Welcome Section */}
          <div className="mb-8 animate-fade-in">
            <h1 className="text-3xl font-display font-bold text-foreground mb-2">
              Welcome back, Admin
            </h1>
            <p className="text-muted-foreground">
              Manage examinations for {college?.name || 'your college'}
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {stats.map((stat, index) => (
              <div
                key={stat.label}
                className="dashboard-card animate-slide-up"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">{stat.label}</p>
                    <p className="text-3xl font-display font-bold text-foreground">{stat.value}</p>
                  </div>
                  <div className={`w-12 h-12 rounded-xl ${stat.bg} flex items-center justify-center`}>
                    <stat.icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Quick Actions */}
            <div className="lg:col-span-1 animate-slide-up stagger-1">
              <div className="dashboard-card">
                <h2 className="text-xl font-display font-bold text-foreground mb-6">Quick Actions</h2>
                <div className="space-y-3">
                  {quickActions.map((action) => (
                    <Button
                      key={action.label}
                      variant={action.variant}
                      className="w-full justify-start h-auto py-4"
                    >
                      <action.icon className="w-5 h-5 mr-3" />
                      <div className="text-left">
                        <p className="font-semibold">{action.label}</p>
                        <p className="text-xs opacity-80">{action.description}</p>
                      </div>
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            {/* Recent Exams */}
            <div className="lg:col-span-2 animate-slide-up stagger-2">
              <div className="dashboard-card">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-display font-bold text-foreground">Recent Exams</h2>
                  <Button variant="ghost" size="sm">
                    View All <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>

                <div className="space-y-4">
                  {recentExams.map((exam, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                          <ClipboardList className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">{exam.name}</p>
                          <p className="text-sm text-muted-foreground">{exam.date}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm font-medium text-foreground">{exam.students} students</p>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            exam.status === 'Published' 
                              ? 'bg-secondary/20 text-secondary' 
                              : 'bg-muted text-muted-foreground'
                          }`}>
                            {exam.status}
                          </span>
                        </div>
                        <Button variant="ghost" size="icon">
                          <ArrowRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* AI Validation Banner */}
          <div className="mt-8 animate-slide-up stagger-3">
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary to-secondary p-8">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
              <div className="relative z-10 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
                    <Sparkles className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-display font-bold text-white mb-1">
                      AI-Powered Seating Validation
                    </h3>
                    <p className="text-white/80">
                      Use Google Gemini to validate seating arrangements and prevent conflicts
                    </p>
                  </div>
                </div>
                <Button variant="glass" size="lg">
                  Run Validation
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
