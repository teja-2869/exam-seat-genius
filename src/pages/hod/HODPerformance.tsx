import React from 'react';
import { HODLayout } from '@/components/layout/HODLayout';
import { PlaceholderPage } from '@/components/layout/PlaceholderPage';
import { BarChart3 } from 'lucide-react';

export default function HODPerformance() {
  return (
    <HODLayout>
      <PlaceholderPage
        breadcrumb={['HOD', 'Reports', 'Performance Metrics']}
        title="Branch Performance Metrics"
        description="Analyze department-wide exam and attendance performance."
        icon={<BarChart3 className="w-8 h-8 text-muted-foreground" />}
      />
    </HODLayout>
  );
}
