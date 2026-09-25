import api from '@/lib/api';

export async function getRoutingQuote(payload) {
  const response = await api.post('/routing/quote', payload);
  return response.data?.data || response.data;
}
