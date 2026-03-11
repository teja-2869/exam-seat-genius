import React from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { PlaceholderPage } from '@/components/layout/PlaceholderPage';
import { PlusCircle } from 'lucide-react';

export default function AdminCreateExam() {
  return (
    <AdminLayout>
      <PlaceholderPage
        breadcrumb={['Admin', 'Exams', 'Create Exam']}
        title="Create New Exam"
        description="Define exam details, subjects, dates, and assign to branches."
        icon={<PlusCircle className="w-8 h-8 text-muted-foreground" />}
      />
    </AdminLayout>
  );
}
