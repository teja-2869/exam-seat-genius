import React from 'react';
import { StudentLayout } from '@/components/layout/StudentLayout';
import { PlaceholderPage } from '@/components/layout/PlaceholderPage';
import { BookOpen } from 'lucide-react';

export default function StudentExamsPage() {
  return (
    <StudentLayout>
      <PlaceholderPage
        breadcrumb={['Student', 'Exams', 'My Exams']}
        title="My Exams"
        description="View your upcoming and past examination details."
        icon={<BookOpen className="w-8 h-8 text-muted-foreground" />}
      />
    </StudentLayout>
  );
}
