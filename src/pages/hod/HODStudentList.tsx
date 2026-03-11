import React from 'react';
import { HODLayout } from '@/components/layout/HODLayout';
import { PlaceholderPage } from '@/components/layout/PlaceholderPage';
import { Users } from 'lucide-react';

export default function HODStudentList() {
  return (
    <HODLayout>
      <PlaceholderPage
        breadcrumb={['HOD', 'Department', 'Student List']}
        title="Student List"
        description="View and manage students in your department."
        icon={<Users className="w-8 h-8 text-muted-foreground" />}
      />
    </HODLayout>
  );
}
