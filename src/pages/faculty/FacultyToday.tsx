import React from 'react';
import { FacultyLayout } from '@/components/layout/FacultyLayout';
import { PlaceholderPage } from '@/components/layout/PlaceholderPage';
import { Clock } from 'lucide-react';

export default function FacultyToday() {
  return (
    <FacultyLayout>
      <PlaceholderPage
        breadcrumb={['Faculty', 'Duties', "Today's Exams"]}
        title="Today's Exams"
        description="View your exam duties and hall assignments for today."
        icon={<Clock className="w-8 h-8 text-muted-foreground" />}
      />
    </FacultyLayout>
  );
}
