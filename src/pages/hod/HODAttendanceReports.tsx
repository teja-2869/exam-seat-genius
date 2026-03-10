import React from 'react';
import { HODLayout } from '@/components/layout/HODLayout';
import { PlaceholderPage } from '@/components/layout/PlaceholderPage';
import { FileSpreadsheet } from 'lucide-react';

export default function HODAttendanceReports() {
  return (
    <HODLayout>
      <PlaceholderPage
        breadcrumb={['HOD', 'Reports', 'Attendance Reports']}
        title="Attendance Reports"
        description="View exam attendance reports for your department."
        icon={<FileSpreadsheet className="w-8 h-8 text-muted-foreground" />}
      />
    </HODLayout>
  );
}
