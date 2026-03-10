import React from 'react';
import { StudentLayout } from '@/components/layout/StudentLayout';
import { PlaceholderPage } from '@/components/layout/PlaceholderPage';
import { User } from 'lucide-react';

export default function StudentProfilePage() {
  return (
    <StudentLayout>
      <PlaceholderPage
        breadcrumb={['Student', 'Profile', 'My Profile']}
        title="My Profile"
        description="View your student profile and account details."
        icon={<User className="w-8 h-8 text-muted-foreground" />}
      />
    </StudentLayout>
  );
}
