'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { AdminPage, AdminTable } from '@/components/admin/AdminUI';

export default function Page() {
  const [rows, setRows] = useState([]);

  async function load() {
    const res = await api.get('/admin/branch-pricing-rules');
    setRows(res.data?.data?.data || res.data?.data || []);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <AdminPage title="Branch Pricing">
      <AdminTable
        rows={rows}
        columns={[
          { key: 'id', label: 'ID' },
          { key: 'branch_name', label: 'Branch' },
          { key: 'service_type_code', label: 'Service' },
          { key: 'base_radius_km', label: 'Radius' },
          { key: 'base_pickup_fee', label: 'Pickup' },
          { key: 'base_delivery_fee', label: 'Delivery' },
          { key: 'pickup_extra_per_km', label: 'Pickup Extra/KM' },
          { key: 'delivery_extra_per_km', label: 'Delivery Extra/KM' },
          { key: 'extra_weight_per_kg', label: 'Weight/KG' },
          { key: 'pod_fee_fixed', label: 'POD Fee' },
          { key: 'is_active', label: 'Active' },
        ]}
      />
    </AdminPage>
  );
}