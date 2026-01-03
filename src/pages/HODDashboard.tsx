import React from 'react';
import { Header } from '@/components/layout/Header';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Users, 
  Upload, 
  Building2, 
  ClipboardList,
  Eye,
  UserCheck,
  FileSpreadsheet,
  ArrowRight,
  Plus
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const stats = [
  { label: 'Department Students', value: '385', icon: Users, color: 'text-secondary', bg: 'bg-secondary/10' },
  { label: 'Classrooms', value: '12', icon: Building2, color: 'text-primary', bg: 'bg-primary/10' },
  { label: 'Upcoming Exams', value: '4', icon: ClipboardList, color: 'text-accent', bg: 'bg-accent/10' },
  { label: 'Faculty', value: '28', icon: UserCheck, color: 'text-panel-student', bg: 'bg-panel-student/10' },
];

const quickActions = [
  { label: 'Upload Students', icon: Upload, description: 'Import student data via CSV', variant: 'hod' as const },
  { label: 'Manage Classrooms', icon: Building2, description: 'Add or edit classroom details', variant: 'secondary' as const },
  { label: 'View Seating', icon: Eye, description: 'Check seating arrangements', variant: 'outline' as const },
  { label: 'View Invigilation', icon: UserCheck, description: 'See invigilation duties', variant: 'outline' as const },
];

const recentUploads = [
  { name: 'Students_Sem4_2025.csv', date: 'Jan 10, 2025', records: 120, status: 'Processed' },
  { name: 'Classroom_Block_A.csv', date: 'Jan 8, 2025', records: 8, status: 'Processed' },
  { name: 'Faculty_List.csv', date: 'Jan 5, 2025', records: 28, status: 'Processed' },
];

const HODDashboard: React.FC = () => {
  const { college, user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-24 pb-12 px-6">
        <div className="max-w-7xl mx-auto">
          {/* Welcome Section */}
          <div className="mb-8 animate-fade-in">
            <h1 className="text-3xl font-display font-bold text-foreground mb-2">
              Department Dashboard
            </h1>
            <p className="text-muted-foreground">
              Manage student and classroom data for your department
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

            {/* Recent Uploads */}
            <div className="lg:col-span-2 animate-slide-up stagger-2">
              <div className="dashboard-card">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-display font-bold text-foreground">Recent Uploads</h2>
                  <Button variant="ghost" size="sm">
                    View All <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>

                <div className="space-y-4">
                  {recentUploads.map((upload, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center">
                          <FileSpreadsheet className="w-5 h-5 text-secondary" />
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">{upload.name}</p>
                          <p className="text-sm text-muted-foreground">{upload.date}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm font-medium text-foreground">{upload.records} records</p>
                          <span className="text-xs px-2 py-1 rounded-full bg-secondary/20 text-secondary">
                            {upload.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Upload Section */}
          <div className="mt-8 animate-slide-up stagger-3">
            <div className="dashboard-card">
              <h2 className="text-xl font-display font-bold text-foreground mb-6">
                Upload Data
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Student Upload */}
                <div className="border-2 border-dashed border-border rounded-2xl p-8 text-center hover:border-secondary transition-colors cursor-pointer">
                  <div className="w-16 h-16 rounded-2xl bg-secondary/10 flex items-center justify-center mx-auto mb-4">
                    <Users className="w-8 h-8 text-secondary" />
                  </div>
                  <h3 className="font-display font-semibold text-lg mb-2">Upload Students</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Import student data from CSV file
                  </p>
                  <Button variant="hod">
                    <Upload className="w-4 h-4 mr-2" />
                    Choose File
                  </Button>
                </div>

                {/* Classroom Upload */}
                <div className="border-2 border-dashed border-border rounded-2xl p-8 text-center hover:border-primary transition-colors cursor-pointer">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Building2 className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="font-display font-semibold text-lg mb-2">Add Classroom</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Enter classroom and lab details
                  </p>
                  <Button variant="default">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Room
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default HODDashboard;
