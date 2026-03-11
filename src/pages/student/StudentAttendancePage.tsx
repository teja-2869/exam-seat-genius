import React from 'react';
import { StudentLayout } from '@/components/layout/StudentLayout';
import { PlaceholderPage } from '@/components/layout/PlaceholderPage';
import { ClipboardCheck } from 'lucide-react';

export default function StudentAttendancePage() {
  return (
    <StudentLayout>
      <PlaceholderPage
        breadcrumb={['Student', 'Attendance', 'Attendance Status']}
        title="Attendance Status"
        description="View your exam attendance records and status."
        icon={<ClipboardCheck className="w-8 h-8 text-muted-foreground" />}
      />
    </StudentLayout>
  );
}
