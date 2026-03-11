import React from 'react';
import { HODLayout } from '@/components/layout/HODLayout';
import { PlaceholderPage } from '@/components/layout/PlaceholderPage';
import { UserCheck } from 'lucide-react';

export default function HODFacultyList() {
  return (
    <HODLayout>
      <PlaceholderPage
        breadcrumb={['HOD', 'Department', 'Faculty List']}
        title="Faculty List"
        description="View and manage faculty members in your department."
        icon={<UserCheck className="w-8 h-8 text-muted-foreground" />}
      />
    </HODLayout>
  );
}
