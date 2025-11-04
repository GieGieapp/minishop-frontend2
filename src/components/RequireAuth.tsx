'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/providers';

export default function RequireAuth({ children }:{children:React.ReactNode}) {
  const { user, loading } = useAuth();
  const r = useRouter();

  useEffect(() => {
    if (!loading && !user) r.replace('/login');
  }, [loading, user, r]);

  if (loading) return null;
  if (!user) return null;
  return <>{children}</>;
}
