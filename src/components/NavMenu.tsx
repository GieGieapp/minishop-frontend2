'use client';
import { Menu } from 'antd';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/app/providers';
import { canView } from '@/lib/rbac';

function rootKey(pathname: string | null) {
  if (!pathname) return '/';
  const seg = pathname.split('/').filter(Boolean);
  return '/' + (seg[0] ?? '');
}

// normalisasi role dari berbagai kemungkinan field
function getRole(u: any): 'ADMIN' | 'MANAGER' | 'STAFF' | null {
  if (!u) return null;
  const candidates = [
    u.role,
    u.role_name,
    u.target_role,
    Array.isArray(u.groups) ? u.groups[0]?.name : null,
    u?.profile?.role,
    u?.claims?.role,
  ].filter(Boolean);
  const raw = String(candidates[0] ?? '').toUpperCase();
  const map: Record<string, 'ADMIN' | 'MANAGER' | 'STAFF'> = {
    ADMIN: 'ADMIN',
    MANAGER: 'MANAGER',
    STAFF: 'STAFF',
  };
  return (map as any)[raw] ?? null;
}

export default function NavMenu() {
  const pathname = usePathname();
  const selected = rootKey(pathname);
  const r = useRouter();
  const { user, loading, logout } = useAuth();
  const role = getRole(user);

  // DEBUG: lihat di console nilai user/role
  // Hapus ini kalau sudah beres
  console.log('[NavMenu] auth =', { loading, user, role });

  async function onClick(e: { key: string }) {
    if (e.key === '__logout') {
      await logout();
      r.replace('/login');
    }
  }

  // Saat loading atau role belum siap, JANGAN sembunyikan menu (biar gak "kedip" / kosong)
  const canShow = (allowed: boolean) => {
    if (loading) return true;
    if (!role) return true;
    return allowed;
  };

  const defs = [
    { key: '/', href: '/', label: 'Dashboard', allow: true },
    { key: '/products', href: '/products', label: 'Products', allow: canView(role, 'PRODUCTS') },
    { key: '/orders', href: '/orders', label: 'Orders', allow: canView(role, 'ORDERS') },
    { key: '/users', href: '/users', label: 'Users', allow: canView(role, 'USERS') },
    { key: '/invitations', href: '/invitations', label: 'Invite Users', allow: canView(role, 'INVITES') },
  ];

  const items = [
    ...defs
      .filter(d => canShow(d.allow))
      .map(d => ({
        key: d.key,
        label: <Link href={d.href}>{d.label}</Link>,
      })),
    { key: '__logout', label: 'Logout' },
  ];

  const actualSelected = items.some(i => i.key === selected) ? selected : '/';

  // DEBUG kecil di UI (hapus jika sudah fix)
  const roleBadge = role ? ` (${role})` : loading ? ' (loading...)' : ' (no role)';

  // Sisipkan badge ke Dashboard biar kelihatan state role
  const dash = items.find(i => i.key === '/');
  if (dash && typeof dash.label !== 'string') {
    dash.label = (
      <Link href="/">
        Dashboard
        <span style={{ opacity: 0.6, marginLeft: 6, fontSize: 12 }}>{roleBadge}</span>
      </Link>
    );
  }

  return (
    <Menu
      theme="dark"
      mode="inline"
      selectedKeys={[actualSelected]}
      items={items}
      onClick={onClick}
    />
  );
}
