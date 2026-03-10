import React from 'react';
import { HODLayout } from '@/components/layout/HODLayout';
import { PlaceholderPage } from '@/components/layout/PlaceholderPage';
import { Eye } from 'lucide-react';

export default function HODSeatingOverview() {
  return (
    <HODLayout>
      <PlaceholderPage
        breadcrumb={['HOD', 'Exams', 'Seating Overview']}
        title="Seating Overview"
        description="Read-only view of published seating arrangements."
        icon={<Eye className="w-8 h-8 text-muted-foreground" />}
      />
    </HODLayout>
  );
}
