'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { AdminPage, AdminTable } from '@/components/admin/AdminUI';

export default function Page() {
  const [rows, setRows] = useState([]);

  async function load() {
    const res = await api.get('/admin/branch-transfer-lanes');
    setRows(res.data?.data?.data || res.data?.data || []);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <AdminPage title="Transfer Lanes">
      <AdminTable
        rows={rows}
        columns={[
          { key: 'id', label: 'ID' },
          { key: 'from_branch_name', label: 'From' },
          { key: 'to_branch_name', label: 'To' },
          { key: 'service_type_code', label: 'Service' },
          { key: 'base_transfer_fee', label: 'Base Fee' },
          { key: 'per_kg_fee', label: 'Per KG' },
          { key: 'estimated_hours', label: 'Hours' },
          { key: 'is_active', label: 'Active' },
        ]}
      />
    </AdminPage>
  );
}