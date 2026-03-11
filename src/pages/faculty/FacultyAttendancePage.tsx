import React from 'react';
import { FacultyLayout } from '@/components/layout/FacultyLayout';
import { PlaceholderPage } from '@/components/layout/PlaceholderPage';
import { ClipboardCheck } from 'lucide-react';

export default function FacultyAttendancePage() {
  return (
    <FacultyLayout>
      <PlaceholderPage
        breadcrumb={['Faculty', 'Operations', 'Attendance']}
        title="Mark Attendance"
        description="Mark and submit student attendance for your assigned exam hall."
        icon={<ClipboardCheck className="w-8 h-8 text-muted-foreground" />}
      />
    </FacultyLayout>
  );
}
