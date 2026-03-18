import React, { useState } from 'react';
import { FacultyLayout } from '@/components/layout/FacultyLayout';
import { FacultyStats } from '@/components/faculty/FacultyStats';
import { FacultyTodayDuty } from '@/components/faculty/FacultyTodayDuty';
import { FacultyDutyList } from '@/components/faculty/FacultyDutyList';
import { FacultyAttendance } from '@/components/faculty/FacultyAttendance';
import { useAuth } from '@/contexts/AuthContext';

const FacultyDashboard: React.FC = () => {
  const { user } = useAuth();
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [activeExamId, setActiveExamId] = useState<string | null>(null);

  const handleStartAttendance = () => {
    // In a real app, this would receive the exam ID
    setActiveExamId('CS301-INTERNAL');
    setShowAttendanceModal(true);
  };

  return (
    <FacultyLayout>
      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8 animate-fade-in">

        {/* Breadcrumb & Welcome Section */}
        <div>
          <div className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
            <span>Faculty</span>
            <span>/</span>
            <span className="text-foreground font-medium">Dashboard</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground mb-2">
            Welcome, {user?.name || 'Faculty Member'}!
          </h1>
          <p className="text-muted-foreground">
            Manage your exam duties, track schedules, and handle attendance submissions seamlessly.
          </p>
        </div>

        {/* Top Section - KPI Cards */}
        <FacultyStats />

        {/* Action Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Middle Section: Active Duty CTA */}
          <div className="lg:col-span-1 animate-slide-up stagger-1 h-fit">
            <FacultyTodayDuty hasExamToday={true} onStartAttendance={handleStartAttendance} />
          </div>

          {/* Bottom/Right Section: Duty List */}
          <div className="lg:col-span-2 animate-slide-up stagger-2 h-[500px]">
            <FacultyDutyList />
          </div>

        </div>
      </div>

      {/* Popovers / Modals */}
      {showAttendanceModal && activeExamId && (
        <FacultyAttendance
          isOpen={showAttendanceModal}
          onClose={() => setShowAttendanceModal(false)}
          examId={activeExamId}
        />
      )}
    </FacultyLayout>
  );
};

export default FacultyDashboard;
