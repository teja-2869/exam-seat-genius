import React from 'react';
import { HODLayout } from '@/components/layout/HODLayout';
import { PlaceholderPage } from '@/components/layout/PlaceholderPage';
import { Upload } from 'lucide-react';

export default function HODStudentUpload() {
  return (
    <HODLayout>
      <PlaceholderPage
        breadcrumb={['HOD', 'Department', 'Upload Students']}
        title="Upload Students"
        description="Import student data via CSV for your department."
        icon={<Upload className="w-8 h-8 text-muted-foreground" />}
      />
    </HODLayout>
  );
}
