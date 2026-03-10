import React from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { PlaceholderPage } from '@/components/layout/PlaceholderPage';
import { UserCheck } from 'lucide-react';

export default function AdminInvigilation() {
  return (
    <AdminLayout>
      <PlaceholderPage
        breadcrumb={['Admin', 'Operations', 'Invigilation Duties']}
        title="Invigilation Duty Management"
        description="Assign, view, and manage invigilation duties across exams."
        icon={<UserCheck className="w-8 h-8 text-muted-foreground" />}
      />
    </AdminLayout>
  );
}
