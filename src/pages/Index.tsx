import React from 'react';
import { PanelCard } from '@/components/panels/PanelCard';
import { Header } from '@/components/layout/Header';
import { ShieldCheck, Users, GraduationCap, BookOpen, Sparkles } from 'lucide-react';

const panels = [
  {
    title: 'Admin Panel',
    description: 'Manage examinations, seating arrangements, invigilation duties, and run AI-powered validations.',
    icon: ShieldCheck,
    role: 'admin' as const,
    route: '/admin/auth',
  },
  {
    title: 'HOD Panel',
    description: 'Upload student and classroom data, view seating arrangements and invigilation schedules.',
    icon: Users,
    role: 'hod' as const,
    route: '/hod/auth',
  },
  {
    title: 'Faculty Panel',
    description: 'View invigilation duties, exam hall layouts, and mark student attendance.',
    icon: GraduationCap,
    role: 'faculty' as const,
    route: '/faculty/verify',
  },
  {
    title: 'Student Panel',
    description: 'Instantly find your exam seat with visual classroom layout and seat location.',
    icon: BookOpen,
    role: 'student' as const,
    route: '/student/verify',
  },
];

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-20 sm:pt-24 pb-12 sm:pb-16 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-10 sm:mb-16 animate-fade-in">
            <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 bg-primary/10 rounded-full text-primary text-xs sm:text-sm font-medium mb-4 sm:mb-6">
              <Sparkles className="w-4 h-4" />
              AI-Powered Examination Management
            </div>
            
            <h1 className="text-3xl sm:text-4xl md:text-6xl font-display font-bold text-foreground mb-4 sm:mb-6">
              <span className="gradient-text">ExamSeat</span> Pro
            </h1>
            
            <p className="text-base sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              A centralized, AI-validated examination seating and invigilation management system 
              designed for engineering colleges.
            </p>
          </div>

          {/* Panels Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {panels.map((panel, index) => (
              <PanelCard
                key={panel.role}
                {...panel}
                delay={index * 100}
              />
            ))}
          </div>

          {/* Features Banner */}
          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in">
            <div className="text-center p-6">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <ShieldCheck className="w-7 h-7 text-primary" />
              </div>
              <h3 className="font-display font-semibold text-lg mb-2">Secure Authentication</h3>
              <p className="text-sm text-muted-foreground">
                Role-based access with Firebase authentication for admins and HODs
              </p>
            </div>
            
            <div className="text-center p-6">
              <div className="w-14 h-14 rounded-2xl bg-secondary/10 flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-7 h-7 text-secondary" />
              </div>
              <h3 className="font-display font-semibold text-lg mb-2">AI Validation</h3>
              <p className="text-sm text-muted-foreground">
                Google Gemini validates seating to prevent same-branch students sitting adjacent
              </p>
            </div>
            
            <div className="text-center p-6">
              <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-4">
                <BookOpen className="w-7 h-7 text-accent" />
              </div>
              <h3 className="font-display font-semibold text-lg mb-2">Visual Seat Finder</h3>
              <p className="text-sm text-muted-foreground">
                Students instantly locate their seats with color-coded classroom layouts
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-6">
        <div className="max-w-6xl mx-auto text-center text-sm text-muted-foreground">
          <p>© 2025 ExamSeat Pro. Built with Firebase & Google Gemini AI.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
