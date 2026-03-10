import React from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { PlaceholderPage } from '@/components/layout/PlaceholderPage';
import { History } from 'lucide-react';

export default function AdminAuditLogs() {
  return (
    <AdminLayout>
      <PlaceholderPage
        breadcrumb={['Admin', 'Settings', 'Audit Logs']}
        title="Audit Logs"
        description="Track all system activities and changes across the platform."
        icon={<History className="w-8 h-8 text-muted-foreground" />}
      />
    </AdminLayout>
  );
}
