'use client';
import { useAuth } from '@/app/providers';

export default function DashboardPage() {
  const { user } = useAuth();
  return (
    <main className="p-6">
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>
        Welcome back{user?.email ? `, ${user.email}` : ''}.
      </h1>
      <p style={{ opacity: 0.8 }}>You’re signed in.</p>
    </main>
  );
}
