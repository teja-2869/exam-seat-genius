import React from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { PlaceholderPage } from '@/components/layout/PlaceholderPage';
import { Settings } from 'lucide-react';

export default function AdminInstitutionSettings() {
  return (
    <AdminLayout>
      <PlaceholderPage
        breadcrumb={['Admin', 'Settings', 'Institution Settings']}
        title="Institution Settings"
        description="Configure college-wide settings, academic years, and policies."
        icon={<Settings className="w-8 h-8 text-muted-foreground" />}
      />
    </AdminLayout>
  );
}
