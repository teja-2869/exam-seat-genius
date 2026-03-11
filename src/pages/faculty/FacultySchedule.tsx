import React from 'react';
import { FacultyLayout } from '@/components/layout/FacultyLayout';
import { PlaceholderPage } from '@/components/layout/PlaceholderPage';
import { Calendar } from 'lucide-react';

export default function FacultySchedule() {
  return (
    <FacultyLayout>
      <PlaceholderPage
        breadcrumb={['Faculty', 'Duties', 'My Schedule']}
        title="My Schedule"
        description="View your upcoming invigilation duty schedule."
        icon={<Calendar className="w-8 h-8 text-muted-foreground" />}
      />
    </FacultyLayout>
  );
}
