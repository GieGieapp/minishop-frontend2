'use client';
import '@ant-design/v5-patch-for-react-19';
import { useEffect, useMemo, useState } from 'react';
import { Button, Card, Typography, Alert, Form, Input, Space, message } from 'antd';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';

type Any = Record<string, any>;

type AcceptState =
  | { phase: 'idle' | 'submitting' }
  | { phase: 'success'; email?: string; role?: string }
  | { phase: 'need_register'; email?: string }
  | { phase: 'error'; code?: number; detail?: string };

function parseErr(status: number, raw: string) {
  try {
    const j = JSON.parse(raw);
    if (Array.isArray(j?.non_field_errors) && j.non_field_errors.length) {
      return j.non_field_errors.join(' ');
    }
    if (j?.detail) return String(j.detail);
    return raw || 'Unknown error';
  } catch {
    return raw || 'Unknown error';
  }
}

function joinUrl(base: string, path: string) {
  const b = base.replace(/\/$/, '');
  const p = path.replace(/^\//, '');
  return `${b}/${p}`;
}

function buildLoginUrl() {
  const base = process.env.NEXT_PUBLIC_APP_BASE_URL || 'http://localhost:3000';
  return joinUrl(base, '/login');
}

function buildDashboardUrl() {
  const base = process.env.NEXT_PUBLIC_APP_BASE_URL || 'http://localhost:3000';
  return joinUrl(base, '/');
}

export default function AcceptInvitationPage() {
  const sp = useSearchParams();
  const router = useRouter();
  const token = useMemo(() => sp.get('token') || '', [sp]);

  const [state, setState] = useState<AcceptState>({ phase: 'idle' });
  const [registering, setRegistering] = useState(false);
  const [form] = Form.useForm<{ username: string; password: string; password2: string }>();

  const acceptUrl = useMemo(() => '/accounts/invitations/accept/', []);

  async function doAccept() {
    if (!token) {
      setState({ phase: 'error', detail: 'Token not found in URL.' });
      return;
    }
    setState({ phase: 'submitting' });
    try {
      const r = await api(acceptUrl, { method: 'POST', body: JSON.stringify({ token }) });
      const txt = await r.text().catch(() => '');
      if (!r.ok) {
        const detail = parseErr(r.status, txt);
        if (r.status === 409 || /register|required/i.test(detail)) {
          try {
            const j = JSON.parse(txt);
            setState({ phase: 'need_register', email: j?.email });
          } catch {
            setState({ phase: 'need_register' });
          }
          return;
        }
        setState({ phase: 'error', code: r.status, detail });
        return;
      }
      let email: string | undefined, role: string | undefined;
      try {
        const j = JSON.parse(txt);
        email = j?.email; role = j?.role;
      } catch {}
      setState({ phase: 'success', email, role });
      message.success('Invitation accepted');
    } catch (e: any) {
      setState({ phase: 'error', detail: e?.message || String(e) });
    }
  }

  async function doRegister(v: { username: string; password: string; password2: string }) {
    if (v.password !== v.password2) {
      message.error('Passwords do not match');
      return;
    }
    setRegistering(true);
    try {
      const r = await api('/accounts/invitations/accept/', {
        method: 'POST',
        body: JSON.stringify({ token, username: v.username, password: v.password }),
      });
      const txt = await r.text().catch(() => '');
      if (!r.ok) {
        message.error(parseErr(r.status, txt));
        try {
          const j = JSON.parse(txt);
          if (j?.username) form.setFields([{ name: 'username', errors: j.username }]);
          if (j?.password) form.setFields([{ name: 'password', errors: j.password }]);
        } catch {}
        return;
      }
      message.success('Registration and acceptance successful');
      setState({ phase: 'success' });
    } catch (e: any) {
      message.error(e?.message || String(e));
    } finally {
      setRegistering(false);
    }
  }

  useEffect(() => {
    doAccept();
  }, [token]);

  return (
    <div style={{ maxWidth: 520, margin: '40px auto', padding: 16 }}>
      <Typography.Title level={3} style={{ marginBottom: 8 }}>Accept Invitation</Typography.Title>
      <Typography.Paragraph type="secondary" style={{ marginTop: 0 }}>
      </Typography.Paragraph>

      {state.phase === 'idle' || state.phase === 'submitting' ? (
        <Card>
          <Typography.Paragraph>Verifying invitation…</Typography.Paragraph>
          <Space>
            <Button type="primary" onClick={doAccept} disabled={state.phase === 'submitting'}>
              Try again
            </Button>
          </Space>
        </Card>
      ) : null}

      {state.phase === 'success' ? (
        <Card>
          <Alert type="success" message="Invitation accepted." showIcon={false} style={{ marginBottom: 12 }} />
          <Typography.Paragraph style={{ marginBottom: 0 }}>
            {state.email ? `Email: ${state.email}` : ''} {state.role ? `(role: ${state.role})` : ''}
          </Typography.Paragraph>
          <Space style={{ marginTop: 12 }}>
            <Button type="primary" onClick={() => router.push(buildDashboardUrl())}>Go to Dashboard</Button>
          </Space>
        </Card>
      ) : null}

      {state.phase === 'need_register' ? (
        <Card>
          <Alert
            type="warning"
            message="Account not found. Please set a password to activate your account and accept the invitation."
            showIcon={false}
            style={{ marginBottom: 12 }}
          />
          <Form form={form} layout="vertical" onFinish={doRegister} initialValues={{ username: '', password: '', password2: '' }}>
            <Form.Item label="Username" name="username" rules={[{ required: true, message: 'Username is required' }]}>
              <Input placeholder="username" />
            </Form.Item>
            <Form.Item label="Password" name="password" rules={[{ required: true, message: 'Password is required' }, { min: 6, message: 'At least 6 characters' }]}>
              <Input.Password placeholder="••••••" />
            </Form.Item>
            <Form.Item label="Confirm Password" name="password2" dependencies={["password"]} rules={[{ required: true, message: 'Please confirm your password' }]}>
              <Input.Password placeholder="••••••" />
            </Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={registering}>Accept</Button>
            </Space>
          </Form>
        </Card>
      ) : null}

      {state.phase === 'error' ? (
        <Card>
          <Alert
            type="error"
            message={state.detail || 'Failed to accept the invitation.'}
            showIcon={false}
            style={{ marginBottom: 12 }}
          />
          <Space>
            <Button type="primary" onClick={doAccept}>Try again</Button>
          </Space>
        </Card>
      ) : null}
    </div>
  );
}
