'use client';

import { useEffect, useState } from 'react';
import { Spin } from 'antd';
import { usePathname, useRouter } from 'next/navigation';
import { getMerchantOnboarding } from '@/services/merchantOnboardingService';

export default function MerchantOnboardingGate({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function check() {
      try {
        const merchant = await getMerchantOnboarding();
        const allowedWhilePending = pathname.includes('/merchant/onboarding') || pathname.includes('/merchant/support');

        if (merchant?.status !== 'active' && !allowedWhilePending) {
          router.replace('/merchant/onboarding');
          return;
        }
      } catch (error) {
        // Auth/layout can handle unauthenticated state.
      } finally {
        setReady(true);
      }
    }

    check();
  }, [pathname, router]);

  if (!ready) {
    return <div style={{ padding: 40 }}><Spin /></div>;
  }

  return children;
}
