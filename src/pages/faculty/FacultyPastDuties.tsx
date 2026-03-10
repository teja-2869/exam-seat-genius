import React from 'react';
import { FacultyLayout } from '@/components/layout/FacultyLayout';
import { PlaceholderPage } from '@/components/layout/PlaceholderPage';
import { History } from 'lucide-react';

export default function FacultyPastDuties() {
  return (
    <FacultyLayout>
      <PlaceholderPage
        breadcrumb={['Faculty', 'History', 'Past Duties']}
        title="Past Duties"
        description="View your completed invigilation duty history."
        icon={<History className="w-8 h-8 text-muted-foreground" />}
      />
    </FacultyLayout>
  );
}
