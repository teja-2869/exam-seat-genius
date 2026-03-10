import React from 'react';
import { HODLayout } from '@/components/layout/HODLayout';
import { PlaceholderPage } from '@/components/layout/PlaceholderPage';
import { UserCog } from 'lucide-react';

export default function HODProfileSettings() {
  return (
    <HODLayout>
      <PlaceholderPage
        breadcrumb={['HOD', 'Settings', 'Profile Settings']}
        title="Profile Settings"
        description="Manage your HOD profile and account preferences."
        icon={<UserCog className="w-8 h-8 text-muted-foreground" />}
      />
    </HODLayout>
  );
}
