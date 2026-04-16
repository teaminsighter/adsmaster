'use client';

import { ReactNode } from 'react';
import { AuthProvider } from '@/lib/contexts/AuthContext';
import { SubscriptionProvider } from '@/lib/contexts/SubscriptionContext';

interface ProvidersProps {
  children: ReactNode;
}

export default function Providers({ children }: ProvidersProps) {
  return (
    <AuthProvider>
      <SubscriptionProvider>
        {children}
      </SubscriptionProvider>
    </AuthProvider>
  );
}
