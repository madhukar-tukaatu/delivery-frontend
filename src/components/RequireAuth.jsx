'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Spin } from 'antd';
import { getToken } from '@/lib/auth';

export default function RequireAuth({ children }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!getToken()) { router.replace('/login'); return; }
    setReady(true);
  }, [router]);
  if (!ready) return <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}><Spin size="large" /></div>;
  return children;
}
