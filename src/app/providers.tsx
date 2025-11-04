// FILE: src/app/providers.tsx
'use client';

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { getAccess, setAccess, clearAccess } from '@/lib/auth';

type Role = 'ADMIN' | 'MANAGER' | 'STAFF';
type User = { id: number; email: string; role: Role } & Record<string, any>;

type Ctx = {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const Ctx = createContext<Ctx | null>(null);

// --- decode JWT ---
function parseJwt(t?: string | null): any | null {
  if (!t) return null;
  try {
    const base64 = t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

// --- derive role (dengan alias) ---
const ROLE_ALIAS: Record<string, Role> = {
  ADMIN: 'ADMIN',
  'ROLE_ADMIN': 'ADMIN',

  MANAGER: 'MANAGER',
  'ROLE_MANAGER': 'MANAGER',
  manager: 'MANAGER',
  Manager: 'MANAGER',
  MGR: 'MANAGER',
  mgr: 'MANAGER',

  STAFF: 'STAFF',
  'ROLE_STAFF': 'STAFF',
  staff: 'STAFF',
  Staff: 'STAFF',
};

function deriveRole(obj: any): Role | null {
  if (!obj) return null;
  const cand =
    obj.role ??
    obj.role_name ??
    obj.target_role ??
    (Array.isArray(obj.groups) ? obj.groups[0]?.name : null) ??
    obj?.claims?.role ??
    (obj.is_superuser ? 'ADMIN' : null);

  if (cand == null) return null;
  if (ROLE_ALIAS[cand]) return ROLE_ALIAS[cand];

  const up = String(cand).toUpperCase();
  if (ROLE_ALIAS[up]) return ROLE_ALIAS[up];

  return (['ADMIN', 'MANAGER', 'STAFF'] as const).includes(up as Role) ? (up as Role) : null;
}

export default function Providers({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // bootstrap
  useEffect(() => {
    (async () => {
      try {
        const token = getAccess();
        if (!token) {
          setUser(null);
          return;
        }
        const r = await api('/accounts/me/');
        if (!r.ok) {
          setUser((prev) => prev ?? null);
          return;
        }
        const me = await r.json();
        const rFromMe = deriveRole(me);
        const rFromJwt = deriveRole(parseJwt(token));
        setUser((prev) => {
          const stable = prev?.role ?? null;
          const next = rFromMe ?? rFromJwt ?? stable;
          return { ...(prev || {}), ...(me || {}), role: (next ?? 'STAFF') as Role };
        });
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // login (username + password) → SimpleJWT
  const login = async (username: string, password: string) => {
    const base = (process.env.NEXT_PUBLIC_API_BASE_URL || '').replace(/\/+$/, '');
    const resp = await fetch(`${base}/accounts/login/`, {      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
      credentials: 'omit',
    });
    const txt = await resp.text();
    const data = (() => {
      try {
        return JSON.parse(txt);
      } catch {
        return {};
      }
    })();
    if (!resp.ok || !data?.access) {
      throw new Error(data?.detail || `Login gagal (${resp.status})`);
    }

    setAccess(data.access);

    const meRes = await api('/accounts/me/');
    if (!meRes.ok) throw new Error('Gagal ambil profil');
    const me = await meRes.json();

    const rFromMe = deriveRole(me);
    const rFromJwt = deriveRole(parseJwt(data.access));
    setUser((prev) => {
      const stable = prev?.role ?? null;
      const next = rFromMe ?? rFromJwt ?? stable;
      return { ...(prev || {}), ...(me || {}), role: (next ?? 'STAFF') as Role };
    });
  };

  const logout = async () => {
    try {
      await api('/accounts/logout/', { method: 'POST' });
    } catch {}
    clearAccess();
    setUser(null);
    setLoading(false);
  };

  const value = useMemo(() => ({ user, loading, login, logout }), [user, loading]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAuth must be used within <Providers>');
  return c;
}
