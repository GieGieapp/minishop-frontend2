'use client';
import RequireAuth from '@/components/RequireAuth';
import AppLayout   from '@/components/AppLayout';
export default function ProtectedLayout({children}:{children:React.ReactNode}) {
  return (<RequireAuth><AppLayout>{children}</AppLayout></RequireAuth>);
}
