import React, { useState, useEffect } from 'react';
import { FacultyLayout } from '@/components/layout/FacultyLayout';
import { FacultyStats } from '@/components/faculty/FacultyStats';
import { FacultyTodayDuty } from '@/components/faculty/FacultyTodayDuty';
import { FacultyDutyList } from '@/components/faculty/FacultyDutyList';
import { FacultyAttendance } from '@/components/faculty/FacultyAttendance';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';

const FacultyDashboard: React.FC = () => {
  const { user, college } = useAuth();
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [activeDuty, setActiveDuty] = useState<any | null>(null);
  const [loadingDuty, setLoadingDuty] = useState(true);

  useEffect(() => {
    const fetchTodayDuty = async () => {
      const castedUser = user as any;
      const collId = castedUser?.institutionId || castedUser?.collegeId || college?.id;
      const uid = castedUser?.uid || castedUser?.id;

      if (!uid || !collId) {
        setLoadingDuty(false);
        return;
      }

      try {
        const todayStr = new Date().toISOString().split('T')[0];
        const q = query(
          collection(db, 'invigilations'),
          where('institutionId', '==', collId),
          where('assignedFacultyId', '==', uid),
          where('date', '==', todayStr),
          where('status', '!=', 'cancelled'),
          limit(1)
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          setActiveDuty({ id: snap.docs[0].id, ...snap.docs[0].data() });
        } else {
          setActiveDuty(null);
        }
      } catch (error) {
        console.error("Error fetching today's duty:", error);
      } finally {
        setLoadingDuty(false);
      }
    };

    fetchTodayDuty();
  }, [user, college]);

  const handleStartAttendance = () => {
    if (activeDuty) {
      setShowAttendanceModal(true);
    }
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
            {loadingDuty ? (
              <div className="h-48 flex items-center justify-center border rounded-xl bg-card">
                <span className="text-sm text-muted-foreground">Loading active duty...</span>
              </div>
            ) : (
              <FacultyTodayDuty duty={activeDuty} onStartAttendance={handleStartAttendance} />
            )}
          </div>

          {/* Bottom/Right Section: Duty List */}
          <div className="lg:col-span-2 animate-slide-up stagger-2 max-h-[500px]">
            <FacultyDutyList />
          </div>

        </div>
      </div>

      {/* Popovers / Modals */}
      {showAttendanceModal && activeDuty && (
        <FacultyAttendance
          isOpen={showAttendanceModal}
          onClose={() => {
            setShowAttendanceModal(false);
            // Refresh duty data after closing (in case attendance was submitted)
            const refresh = async () => {
              const castedUser = user as any;
              const collId = castedUser?.institutionId || castedUser?.collegeId || college?.id;
              const uid = castedUser?.uid || castedUser?.id;
              if (uid && collId) {
                const todayStr = new Date().toISOString().split('T')[0];
                const snap = await getDocs(query(
                  collection(db, 'invigilations'),
                  where('institutionId', '==', collId),
                  where('assignedFacultyId', '==', uid),
                  where('date', '==', todayStr),
                  where('status', '!=', 'cancelled'),
                  limit(1)
                ));
                if (!snap.empty) {
                  setActiveDuty({ id: snap.docs[0].id, ...snap.docs[0].data() });
                }
              }
            };
            refresh();
          }}
          examId={activeDuty.id}
        />
      )}
    </FacultyLayout>
  );
};

export default FacultyDashboard;
