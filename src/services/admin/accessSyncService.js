import api from '@/lib/api';

export async function syncAccessPermissions() {
  const response = await api.post('/admin/access/sync');
  return response.data?.data || response.data;
}
