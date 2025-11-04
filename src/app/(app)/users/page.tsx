'use client';
import '@ant-design/v5-patch-for-react-19';
import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Table, Typography, Space, Button, Drawer, Descriptions,
  Form, Input, Skeleton, message, Select
} from 'antd';
import { api } from '@/lib/api';

type User = {
  id: number;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  is_staff: boolean;
  is_superuser: boolean;
  groups?: Array<{ id: number; name: string }>;
  role?: string;
  role_name?: string;
  target_role?: string;
};

const ROLE_OPTIONS = [
  { label: 'admin', value: 'admin' },
  { label: 'manager', value: 'manager' },
  { label: 'staff', value: 'staff' },
];

export default function UsersPage() {
  const [rows, setRows] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const [open, setOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<'view' | 'edit'>('view');
  const [currentId, setCurrentId] = useState<number | null>(null);
  const [detail, setDetail] = useState<User | null>(null);
  const [form] = Form.useForm<User>();

  const listUrl = '/accounts/users/';
  const detailUrl = (id: number) => `/accounts/users/${id}/`;

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api(listUrl);
      const data = await r.json().catch(() => null);
      if (!r.ok) throw new Error(typeof data === 'string' ? data : `HTTP ${r.status}`);
      setRows(Array.isArray(data) ? data : data?.results ?? []);
    } catch (e: any) {
      message.error(e?.message || String(e));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadList(); }, [loadList]);

  const deriveRole = (u: Partial<User>) =>
    u.role ?? u.role_name ?? u.target_role ?? (Array.isArray(u.groups) ? u.groups[0]?.name : '-') ?? '-';

  const openDetail = useCallback(async (id: number, nextMode: 'view' | 'edit' = 'view') => {
    setMode(nextMode);
    setOpen(true);
    setCurrentId(id);
    setDetailLoading(true);
    try {
      const r = await api(detailUrl(id));
      const data = (await r.json()) as User;
      if (!r.ok) { message.error(`Gagal memuat user #${id}`); return; }

      setDetail(data);
      form.resetFields();

      if (nextMode === 'edit') {
        form.setFieldsValue({
          username: data.username,
          email: data.email,
          first_name: data.first_name,
          last_name: data.last_name,
          role: deriveRole(data) as any,
        } as User);
      }
    } catch (e: any) {
      message.error(e?.message || String(e));
    } finally {
      setDetailLoading(false);
    }
  }, [form]);

  const onClose = () => {
    setOpen(false);
    setMode('view');
    setCurrentId(null);
    setDetail(null);
    form.resetFields();
  };

  const save = useCallback(async () => {
    if (currentId == null || mode !== 'edit') return;
    try {
      const v = await form.validateFields();
      setSaving(true);
      const r = await api(detailUrl(currentId), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: v.username,
          email: v.email,
          first_name: v.first_name,
          last_name: v.last_name,
          role: v.role,
        }),
      });
      const txt = await r.text().catch(() => '');
      if (!r.ok) { message.error(txt || `HTTP ${r.status}`); return; }
      message.success('User updated');
      onClose();
      await loadList();
    } catch (e: any) {
      if (e?.errorFields) return;
      message.error(e?.message || String(e));
    } finally {
      setSaving(false);
    }
  }, [currentId, mode, form, loadList]);

  const columns = useMemo(() => ([
    { title: 'ID', dataIndex: 'id', width: 80 },
    { title: 'Username', dataIndex: 'username' },
    { title: 'Email', dataIndex: 'email' },
    { title: 'Role', width: 140, render: (_: any, r: User) => deriveRole(r) },
    {
      title: 'Actions',
      width: 170,
      render: (_: any, r: User) => (
        <Space>
          <Button size="small" onClick={(e) => { e.stopPropagation(); openDetail(r.id, 'view'); }}>View</Button>
          <Button size="small" type="primary" onClick={(e) => { e.stopPropagation(); openDetail(r.id, 'edit'); }}>Edit</Button>
        </Space>
      ),
    },
  ]), [openDetail]);

  return (
    <div style={{ padding: 16 }}>
      <Typography.Title level={3} style={{ marginBottom: 16 }}>Users</Typography.Title>

      <Table<User>
        rowKey="id"
        loading={loading}
        dataSource={rows}
        pagination={{ pageSize: 10 }}
        columns={columns}
        onRow={(record) => ({
          onClick: () => openDetail(record.id, 'view'),
          style: { cursor: 'pointer' },
        })}
      />

      <Drawer
        title={`${mode === 'view' ? 'View' : 'Edit'} User${currentId ? ` #${currentId}` : ''}`}
        width={560}
        open={open}
        onClose={onClose}
        forceRender
        extra={
          mode === 'edit' ? (
            <Space>
              <Button onClick={onClose}>Cancel</Button>
              <Button type="primary" onClick={save} loading={saving}>Save</Button>
            </Space>
          ) : null
        }
      >
        {mode === 'view' && (
          <Skeleton active loading={detailLoading} paragraph={false}>
            <Descriptions bordered size="small" column={1}>
              <Descriptions.Item label="ID">{detail?.id ?? currentId ?? '-'}</Descriptions.Item>
              <Descriptions.Item label="Username">{detail?.username ?? '-'}</Descriptions.Item>
              <Descriptions.Item label="Email">{detail?.email ?? '-'}</Descriptions.Item>
              <Descriptions.Item label="Role">{deriveRole(detail ?? {})}</Descriptions.Item>
            </Descriptions>
          </Skeleton>
        )}

        <Form
          key={currentId ?? 'new'}
          form={form}
          layout="vertical"
          preserve={false}
          disabled={detailLoading || mode === 'view'}
          hidden={mode === 'view'}
        >
          <Form.Item label="Username" name="username" rules={[{ required: true, message: 'Username wajib' }]}>
            <Input />
          </Form.Item>
          <Form.Item label="Email" name="email" rules={[{ required: true, type: 'email', message: 'Email tidak valid' }]}>
            <Input />
          </Form.Item>
          <Form.Item label="First Name" name="first_name">
            <Input />
          </Form.Item>
          <Form.Item label="Last Name" name="last_name">
            <Input />
          </Form.Item>

          <Form.Item
            label="Role"
            name="role"
            rules={[{ required: true, message: 'Role wajib' }]}
          >
            <Select
              options={ROLE_OPTIONS}
              placeholder="Select Role"
            />
          </Form.Item>
        </Form>
      </Drawer>
    </div>
  );
}