import React from 'react';
import { HODLayout } from '@/components/layout/HODLayout';
import { PlaceholderPage } from '@/components/layout/PlaceholderPage';
import { ClipboardList } from 'lucide-react';

export default function HODInvigilation() {
  return (
    <HODLayout>
      <PlaceholderPage
        breadcrumb={['HOD', 'Exams', 'Invigilation Overview']}
        title="Invigilation Overview"
        description="View invigilation duty assignments for your department faculty."
        icon={<ClipboardList className="w-8 h-8 text-muted-foreground" />}
      />
    </HODLayout>
  );
}
