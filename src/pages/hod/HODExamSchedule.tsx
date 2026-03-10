import React from 'react';
import { HODLayout } from '@/components/layout/HODLayout';
import { PlaceholderPage } from '@/components/layout/PlaceholderPage';
import { Calendar } from 'lucide-react';

export default function HODExamSchedule() {
  return (
    <HODLayout>
      <PlaceholderPage
        breadcrumb={['HOD', 'Exams', 'Exam Schedule']}
        title="Exam Schedule"
        description="View upcoming and past exam schedules for your department."
        icon={<Calendar className="w-8 h-8 text-muted-foreground" />}
      />
    </HODLayout>
  );
}
