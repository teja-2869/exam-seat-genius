import React from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { PlaceholderPage } from '@/components/layout/PlaceholderPage';
import { FileCheck } from 'lucide-react';

export default function AdminAttendanceReports() {
  return (
    <AdminLayout>
      <PlaceholderPage
        breadcrumb={['Admin', 'Operations', 'Attendance Reports']}
        title="Attendance Reports"
        description="View exam-wise attendance reports submitted by faculty."
        icon={<FileCheck className="w-8 h-8 text-muted-foreground" />}
      />
    </AdminLayout>
  );
}
