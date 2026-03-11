import React from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { PlaceholderPage } from '@/components/layout/PlaceholderPage';
import { Calendar } from 'lucide-react';

export default function AdminExamSchedule() {
  return (
    <AdminLayout>
      <PlaceholderPage
        breadcrumb={['Admin', 'Exams', 'Exam Schedule']}
        title="Exam Schedule"
        description="View and manage the complete examination timetable."
        icon={<Calendar className="w-8 h-8 text-muted-foreground" />}
      />
    </AdminLayout>
  );
}
