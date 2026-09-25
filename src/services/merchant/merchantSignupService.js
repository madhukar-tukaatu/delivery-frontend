import api from '@/lib/api';

export async function signupMerchant(payload) {
  const response = await api.post('/merchant/signup', payload);
  return response.data?.data || response.data;
}
