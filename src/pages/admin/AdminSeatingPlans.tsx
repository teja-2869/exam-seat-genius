import React from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { PlaceholderPage } from '@/components/layout/PlaceholderPage';
import { ClipboardList } from 'lucide-react';

export default function AdminSeatingPlans() {
  return (
    <AdminLayout>
      <PlaceholderPage
        breadcrumb={['Admin', 'Exams', 'Seating Plans']}
        title="Seating Plans"
        description="View, validate, and publish AI-generated seating arrangements."
        icon={<ClipboardList className="w-8 h-8 text-muted-foreground" />}
      />
    </AdminLayout>
  );
}
