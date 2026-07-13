'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { AdminPage, AdminTable } from '@/components/admin/AdminUI';

export default function Page() {
  const [rows, setRows] = useState([]);

  async function load() {
    const res = await api.get('/admin/service-types');
    setRows(res.data?.data?.data || res.data?.data || []);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <AdminPage title="Service Types">
      <AdminTable
        rows={rows}
        columns={[
          { key: 'id', label: 'ID' },
          { key: 'code', label: 'Code' },
          { key: 'name', label: 'Name' },
          { key: 'price_multiplier', label: 'Multiplier' },
          { key: 'fixed_addon_fee', label: 'Addon' },
          { key: 'is_active', label: 'Active' },
        ]}
      />
    </AdminPage>
  );
}