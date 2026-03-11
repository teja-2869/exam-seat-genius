import React from 'react';
import { StudentLayout } from '@/components/layout/StudentLayout';
import { PlaceholderPage } from '@/components/layout/PlaceholderPage';
import { MapPin } from 'lucide-react';

export default function StudentSeatViewPage() {
  return (
    <StudentLayout>
      <PlaceholderPage
        breadcrumb={['Student', 'Exams', 'Seat Details']}
        title="Seat Details"
        description="View your assigned seat with classroom layout visualization."
        icon={<MapPin className="w-8 h-8 text-muted-foreground" />}
      />
    </StudentLayout>
  );
}
