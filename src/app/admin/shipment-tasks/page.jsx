'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { AdminPage, AdminTable } from '@/components/admin/AdminUI';

export default function Page() {
  const [rows, setRows] = useState([]);

  async function load() {
    const res = await api.get('/admin/shipment-tasks');
    setRows(res.data?.data?.data || res.data?.data || []);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <AdminPage title="Shipment Tasks">
      <AdminTable
        rows={rows}
        columns={[
          { key: 'task_number', label: 'Task' },
          { key: 'tracking_number', label: 'Tracking' },
          { key: 'type', label: 'Type' },
          { key: 'status', label: 'Status' },
          { key: 'priority', label: 'Priority' },
          { key: 'branch_name', label: 'Branch' },
          { key: 'due_at', label: 'Due' },
        ]}
      />
    </AdminPage>
  );
}