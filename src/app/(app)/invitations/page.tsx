'use client';
import '@ant-design/v5-patch-for-react-19';
import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  Button,
  Form,
  Input,
  Select,
  Typography,
  Card,
  Table,
  Space,
  Popconfirm,
  message,
  Alert,
  Row,
  Col,
  TableProps,
} from 'antd';
import { api } from '@/lib/api';

// === Types ===
type InvitePayload = { email: string; role: 'admin' | 'manager' | 'staff' };
type Any = Record<string, any>;

// === Helpers ===
function parseErr(status: number, raw: string) {
  try {
    const j = JSON.parse(raw);
    if (Array.isArray(j?.non_field_errors) && j.non_field_errors.length) {
      return `Failed (${status})\n\n${j.non_field_errors.join(' ')}`;
    }
    if (j?.detail) return `Failed (${status})\n\n${j.detail}`;
    return `Failed (${status})\n\n${raw}`;
  } catch {
    return `Failed (${status})\n\n${raw || 'Unknown error'}`;
  }
}

const fmt = (ts?: string) => {
  if (!ts) return '-';
  const d = new Date(ts);
  if (isNaN(d.getTime())) return ts as string;
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
};

function joinUrl(base: string, path: string) {
  const b = base.replace(/\/$/, '');
  const p = path.replace(/^\//, '');
  return `${b}/${p}`;
}

function buildAcceptUrl(token?: string) {
  if (!token) return '';
  const base = process.env.NEXT_PUBLIC_APP_BASE_URL || 'http://localhost:3000';
  return joinUrl(base, `/accept?token=${token}`);
}

// --- Status helpers (timestamps from BE) ---
const inferStatus = (r: Any) => {
  const now = new Date();
  const revokedAt = r?.revoked_at ? new Date(r.revoked_at) : null;
  const usedAt = r?.used_at ? new Date(r.used_at) : null;
  const expiresAt = r?.expires_at ? new Date(r.expires_at) : null;

  if (revokedAt) return 'revoked';
  if (usedAt) return 'accepted';
  if (expiresAt && expiresAt < now) return 'expired';
  return 'pending';
};

const STATUS_META: Record<string, { label: string; bg: string; border: string }> = {
  pending: { label: 'Pending', bg: '#fafafa', border: '#e5e7eb' },
  accepted: { label: 'Accepted', bg: '#f6ffed', border: '#b7eb8f' },
  revoked: { label: 'Revoked', bg: '#fff1f0', border: '#ffa39e' },
  expired: { label: 'Expired', bg: '#fff7e6', border: '#ffd591' },
};

const statusSpanStyle: React.CSSProperties = {
  display: 'inline-block',
  padding: '2px 8px',
  borderRadius: 999,
  lineHeight: 1.6,
};

const pick = (r: Any, keys: string[], d: any = '') =>
  keys.reduce<any>((v, k) =>
    v !== undefined && v !== null
      ? v
      : k.includes('.')
      ? k.split('.').reduce<any>((x, y) => (x ? x[y] : undefined), r)
      : (r as Any)[k],
  undefined) ?? d;

export default function InviteUsersPage() {
  const [form] = Form.useForm<InvitePayload>();
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<Any[]>([]);
  const [fetching, setFetching] = useState(true);
  const [rowBusy, setRowBusy] = useState<Record<string, boolean>>({});

  const [lastInviteLink, setLastInviteLink] = useState<string>('');
  const isDev = process.env.NODE_ENV !== 'production';

  // === API endpoints ===
  const listUrl = useMemo(() => '/accounts/invitations/', []);
  const postUrl = listUrl; // create
  const resendUrl = (id: string | number) => `/accounts/invitations/${id}/resend/`;
  const revokeUrl = (id: string | number) => `/accounts/invitations/${id}/revoke/`;

  const loadInvites = useCallback(async () => {
    setFetching(true);
    try {
      const r = await api(listUrl);
      const data = await r.json().catch(() => null);
      if (!r.ok) {
        message.error(parseErr(r.status, JSON.stringify(data)));
        setRows([]);
        return;
      }
      const list = Array.isArray(data) ? data : data?.results ?? [];
      setRows(list);
    } catch (e: any) {
      message.error(`Failed to load invitations\n\n${e?.message || e}`);
      setRows([]);
    } finally {
      setFetching(false);
    }
  }, [listUrl]);

  useEffect(() => {
    loadInvites();
  }, [loadInvites]);

  const onFinish = useCallback(
    async (v: InvitePayload) => {
      setLoading(true);
      try {
        const r = await api(postUrl, { method: 'POST', body: JSON.stringify(v) });
        const txt = await r.text().catch(() => '');
        if (!r.ok) {
          message.error(parseErr(r.status, txt));
          return;
        }
        let acceptUrl = '';
        try {
          const data = JSON.parse(txt);
          if (data?.accept_url) acceptUrl = String(data.accept_url);
          else if (data?.token) acceptUrl = buildAcceptUrl(String(data.token));
        } catch {}

        message.success(`Invitation sent to ${v.email}`);
        if (isDev && acceptUrl) {
          setLastInviteLink(acceptUrl);
          message.info('Dev: Invite link is available to copy.');
        } else {
          setLastInviteLink('');
        }
        form.resetFields();
        await loadInvites();
      } catch (e: any) {
        message.error(`Failed to send invitation\n\n${e?.message || e}`);
      } finally {
        setLoading(false);
      }
    },
    [postUrl, isDev, form, loadInvites],
  );

  const rowAcceptUrl = useCallback((r: Any) => {
    const token = pick(r, ['token', 'invite_token', 'uuid']);
    const accept = pick(r, ['accept_url', 'accept_link']);
    if (accept) return String(accept);
    if (token) return buildAcceptUrl(String(token));
    return '';
  }, []);

  const doAction = useCallback(
    async (kind: 'resend' | 'revoke', id: string | number) => {
      const key = String(id);
      setRowBusy((m) => ({ ...m, [key]: true }));
      try {
        const url = kind === 'resend' ? resendUrl(id) : revokeUrl(id);
        const r = await api(url, { method: 'POST' });
        const txt = await r.text().catch(() => '');
        if (!r.ok) {
          message.error(parseErr(r.status, txt));
          return;
        }
        message.success(kind === 'resend' ? 'Invitation re-sent' : 'Invitation revoked');
        await loadInvites();
      } catch (e: any) {
        message.error(`${kind === 'resend' ? 'Failed to resend' : 'Failed to revoke'}\n\n${e?.message || e}`);
      } finally {
        setRowBusy((m) => ({ ...m, [key]: false }));
      }
    },
    [loadInvites],
  );

  const tableColumns = useMemo(
    (): TableProps<Any>['columns'] => [
      {
        title: 'ID',
        render: (_, r) => String(pick(r, ['id', 'pk', 'uuid'])),
        width: 96,
        ellipsis: true,
        responsive: ['sm'],
      },
      {
        title: 'Email',
        render: (_, r) => (
          <Typography.Text ellipsis={{ tooltip: pick(r, ['email', 'invitee', 'user.email']) }}>
            {pick(r, ['email', 'invitee', 'user.email'])}
          </Typography.Text>
        ),
        width: 240,
        ellipsis: true,
        responsive: ['xs', 'sm', 'md', 'lg', 'xl'],
      },
      {
        title: 'Role',
        render: (_, r) => pick(r, ['role', 'target_role', 'role_name'], '-'),
        width: 120,
        ellipsis: true,
        responsive: ['md'],
      },
      {
        title: 'Status',
        render: (_, r) => {
          const s = inferStatus(r);
          const m = STATUS_META[s];
          return (
            <span style={{ ...statusSpanStyle, background: m.bg, border: `1px solid ${m.border}` }}>
              {m.label}
            </span>
          );
        },
        width: 120,
        responsive: ['xs', 'sm', 'md', 'lg', 'xl'],
        filters: [
          { text: 'Pending', value: 'pending' },
          { text: 'Accepted', value: 'accepted' },
          { text: 'Revoked', value: 'revoked' },
          { text: 'Expired', value: 'expired' },
        ],
        onFilter: (value, r) => inferStatus(r) === value,
      },
      {
        title: 'Expires',
        render: (_, r) => fmt(pick(r, ['expires_at', 'expired_at', 'expires'])),
        width: 180,
        ellipsis: true,
        responsive: ['xs','sm','md','lg','xl'],
      },
      {
        title: 'Created',
        render: (_, r) => fmt(pick(r, ['created_at', 'created', 'date_created'])),
        width: 180,
        ellipsis: true,
        responsive: ['lg', 'xl'],
      },
      {
        title: 'Actions',
        fixed: 'right',
        width: 260,
        responsive: ['xs','sm','md','lg','xl'],
        render: (_, r) => {
          const id = pick(r, ['id', 'pk', 'uuid']);
          const busy = !!rowBusy[String(id)];
          const link = rowAcceptUrl(r);
          return (
            <Space size={8} wrap>
              <Button size="small" loading={busy} onClick={() => doAction('resend', id)}>Resend</Button>
              <Popconfirm
                title="Revoke invitation?"
                okText="Revoke"
                cancelText="Cancel"
                onConfirm={() => doAction('revoke', id)}
              >
                <Button size="small" danger loading={busy}>Revoke</Button>
              </Popconfirm>
              {isDev && link && (
                <Typography.Link
                  onClick={() => {
                    navigator.clipboard.writeText(link);
                    message.success('Invite link copied');
                  }}
                >
                  Copy link
                </Typography.Link>
              )}
            </Space>
          );
        },
      },
    ],
    [rowBusy, isDev, doAction, rowAcceptUrl],
  );

  return (
    <div style={{ padding: 16, maxWidth: 900, margin: '0 auto' }}>
      <Typography.Title level={3} style={{ marginBottom: 16 }}>Invite Users</Typography.Title>

      {isDev && lastInviteLink && (
        <Card style={{ marginBottom: 12 }}>
          <Alert
            type="info"
            message="Dev: Email is printed to the console. Use the link below to test the acceptance flow."
            showIcon
            style={{ marginBottom: 8 }}
          />
          <Typography.Paragraph copyable={{ text: lastInviteLink }}>
            {lastInviteLink}
          </Typography.Paragraph>
        </Card>
      )}

      <Card style={{ marginBottom: 16 }}>
        <Form form={form} layout="vertical" onFinish={onFinish} initialValues={{ role: 'staff' }}>
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                name="email"
                label="Email"
                rules={[
                  { required: true, message: 'Email is required' },
                  { type: 'email', message: 'Please enter a valid email address' },
                ]}
              >
                <Input placeholder="user@example.com" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="role"
                label="Role"
                rules={[{ required: true, message: 'Role is required' }]}
              >
                <Select
                  options={[
                    { value: 'staff', label: 'Staff' },
                    { value: 'manager', label: 'Manager' },
                    { value: 'admin', label: 'Admin' },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>
          <Space>
            <Button type="primary" htmlType="submit" loading={loading}>Send Invitation</Button>
          </Space>
        </Form>
      </Card>

      <Card>
        <Table<Any>
          rowKey={(r) => String(pick(r, ['id', 'pk', 'uuid']))}
          loading={fetching}
          dataSource={rows}
          columns={tableColumns}
          tableLayout="fixed"
          size="middle"
          sticky
          scroll={{ x: 720 }}
          pagination={{
            pageSize: 10,
            responsive: true,
            showSizeChanger: true,
            pageSizeOptions: [5, 10, 20, 50],
          }}
        />
      </Card>
    </div>
  );
}
