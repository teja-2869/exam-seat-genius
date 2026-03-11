import React from 'react';
import { HODLayout } from '@/components/layout/HODLayout';
import { PlaceholderPage } from '@/components/layout/PlaceholderPage';
import { Building2 } from 'lucide-react';

export default function HODRooms() {
  return (
    <HODLayout>
      <PlaceholderPage
        breadcrumb={['HOD', 'Department', 'Department Rooms']}
        title="Department Rooms"
        description="View and manage classrooms and labs assigned to your department."
        icon={<Building2 className="w-8 h-8 text-muted-foreground" />}
      />
    </HODLayout>
  );
}
