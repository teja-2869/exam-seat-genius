import React from 'react';
import { FacultyLayout } from '@/components/layout/FacultyLayout';
import { PlaceholderPage } from '@/components/layout/PlaceholderPage';
import { FileCheck } from 'lucide-react';

export default function FacultyAttendanceLogs() {
  return (
    <FacultyLayout>
      <PlaceholderPage
        breadcrumb={['Faculty', 'History', 'Attendance Logs']}
        title="Attendance Logs"
        description="View past attendance submissions and records."
        icon={<FileCheck className="w-8 h-8 text-muted-foreground" />}
      />
    </FacultyLayout>
  );
}
