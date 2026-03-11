import React from 'react';
import { HODLayout } from '@/components/layout/HODLayout';
import { PlaceholderPage } from '@/components/layout/PlaceholderPage';
import { Settings } from 'lucide-react';

export default function HODDepartmentSettings() {
  return (
    <HODLayout>
      <PlaceholderPage
        breadcrumb={['HOD', 'Settings', 'Department Settings']}
        title="Department Settings"
        description="Configure department-specific settings and preferences."
        icon={<Settings className="w-8 h-8 text-muted-foreground" />}
      />
    </HODLayout>
  );
}
