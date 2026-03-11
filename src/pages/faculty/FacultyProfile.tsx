import React from 'react';
import { FacultyLayout } from '@/components/layout/FacultyLayout';
import { PlaceholderPage } from '@/components/layout/PlaceholderPage';
import { User } from 'lucide-react';

export default function FacultyProfile() {
  return (
    <FacultyLayout>
      <PlaceholderPage
        breadcrumb={['Faculty', 'Profile', 'My Profile']}
        title="My Profile"
        description="View your faculty profile and account details."
        icon={<User className="w-8 h-8 text-muted-foreground" />}
      />
    </FacultyLayout>
  );
}
