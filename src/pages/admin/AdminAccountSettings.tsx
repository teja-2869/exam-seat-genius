import React from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { PlaceholderPage } from '@/components/layout/PlaceholderPage';
import { UserCog } from 'lucide-react';

export default function AdminAccountSettings() {
  return (
    <AdminLayout>
      <PlaceholderPage
        breadcrumb={['Admin', 'Settings', 'Account Settings']}
        title="Account Settings"
        description="Manage your admin profile, password, and preferences."
        icon={<UserCog className="w-8 h-8 text-muted-foreground" />}
      />
    </AdminLayout>
  );
}
