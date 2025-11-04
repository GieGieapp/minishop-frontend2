'use client';
import '@ant-design/v5-patch-for-react-19';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Table, Typography, Tag, Space, Button,
  Drawer, Form, InputNumber, Select, Input, message, Divider
} from 'antd';
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';
import { api } from '@/lib/api';
import { canEdit } from '@/lib/rbac';

type OrderItem = { id?: number; product: number; qty: number; price: string };
type Order = {
  id: number; user: number; status: string;
  items: OrderItem[]; created_at: string; updated_at: string;
};

const fmt = (ts?: string) => {
  if (!ts) return '-';
  const d = new Date(ts);
  if (isNaN(d.getTime())) return ts as string;
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Jakarta', year: 'numeric', month: 'short', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(d);
};
const calcTotal = (items: OrderItem[]) =>
  items.reduce((acc, it) => acc + (Number(it.price) || 0) * (it.qty || 0), 0);

const norm = (v: any) => String(v ?? '').replace(/['"]/g, '').trim().toUpperCase();

export default function OrdersPage() {
  const [rows, setRows] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [currentId, setCurrentId] = useState<number | null>(null);
  const [mode, setMode] = useState<'view' | 'edit'>('view');
  const [form] = Form.useForm<Order>();
  const [role, setRole] = useState<string | null>(null);

  const bootstrapRole = useCallback(async () => {
    if (typeof window !== 'undefined') {
      const cached = sessionStorage.getItem('role') || localStorage.getItem('role');
      if (cached) {
        setRole(norm(cached));
        return;
      }
    }
    try {
      const r = await api('/accounts/me/');
      const data = await r.json().catch(() => null);
      const guess =
        data?.role ||
        data?.role_name ||
        (data?.is_superuser ? 'ADMIN' : '') ||
        (Array.isArray(data?.groups) && data.groups.length ? data.groups[0]?.name : '');
      setRole(norm(guess));
    } catch {
      setRole(null);
    }
  }, []);

  useEffect(() => { bootstrapRole(); }, [bootstrapRole]);

  const baseUrl = '/orders/';

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api(baseUrl);
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

  const openDetail = async (id: number, nextMode: 'view' | 'edit') => {
    setMode(nextMode);
    setOpen(true);
    setCurrentId(id);
    setDetailLoading(true);
    try {
      const r = await api(`${baseUrl}${id}/`);
      const data = (await r.json().catch(() => null)) as Order | null;
      if (!r.ok || !data) {
        message.error(`Failed to load order #${id}`);
        return;
      }
      form.resetFields();
      form.setFieldsValue(data as any);
    } catch (e: any) {
      message.error(e?.message || String(e));
    } finally {
      setDetailLoading(false);
    }
  };

  const save = async () => {
    if (!currentId || mode !== 'edit') return;
    try {
      const v = await form.validateFields();
      setSaving(true);
      const payload = {
        user: v.user,
        status: v.status,
        items: (v.items || []).map((it: any) => ({
          id: it.id,
          product: Number(it.product),
          qty: Number(it.qty || 0),
          price: String(it.price ?? '0'),
        })),
      };
      const r = await api(`${baseUrl}${currentId}/`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      const txt = await r.text().catch(() => '');
      if (!r.ok) { message.error(txt || `HTTP ${r.status}`); return; }
      message.success('Order updated');
      setOpen(false);
      await loadList();
    } catch (e: any) {
      if (e?.errorFields) return;
      message.error(e?.message || String(e));
    } finally {
      setSaving(false);
    }
  };

  const columns = useMemo(() => [
    { title: 'ID', dataIndex: 'id', width: 80 },
    { title: 'User', dataIndex: 'user', width: 100 },
    {
      title: 'Status', dataIndex: 'status', width: 120,
      render: (s: string) => <Tag>{(s || '').toUpperCase()}</Tag>,
      filters: [
        { text: 'pending', value: 'pending' },
        { text: 'paid', value: 'paid' },
        { text: 'cancelled', value: 'cancelled' },
      ],
      onFilter: (v: any, r: Order) => (r.status || '').toLowerCase() === String(v),
    },
    { title: 'Items', key: 'items_count', width: 100, render: (_: any, r: Order) => r.items?.length ?? 0 },
    { title: 'Total', key: 'total_amount', width: 120, render: (_: any, r: Order) => calcTotal(r.items || []).toFixed(2) },
    { title: 'Created', dataIndex: 'created_at', render: (v: string) => fmt(v), width: 180 },
    {
      title: 'Actions', fixed: 'right', width: 160,
      render: (_: any, r: Order) => (
        <Space>
          <Button size="small" onClick={() => openDetail(r.id, 'view')}>View</Button>
          {canEdit(role, 'ORDERS') && (
            <Button size="small" type="primary" onClick={() => openDetail(r.id, 'edit')}>Edit</Button>
          )}
        </Space>
      ),
    },
  ], [role]);

  const items: OrderItem[] = Form.useWatch('items', form) || [];
  const liveTotal = calcTotal(items || []);

  return (
    <div style={{ padding: 16 }}>
      <Typography.Title level={3} style={{ marginBottom: 12 }}>Orders</Typography.Title>

      <Table<Order>
        rowKey="id"
        loading={loading}
        dataSource={rows}
        pagination={{ pageSize: 10 }}
        columns={columns}
        expandable={{
          expandedRowRender: (record: Order) => (
            <Table<OrderItem>
              size="small"
              rowKey={(it) => String(it.id ?? `${record.id}-${it.product}`)}
              pagination={false}
              dataSource={record.items || []}
              columns={[
                { title: 'Item ID', dataIndex: 'id', width: 90 },
                { title: 'Product', dataIndex: 'product', width: 120 },
                { title: 'Qty', dataIndex: 'qty', width: 80 },
                { title: 'Price', dataIndex: 'price', width: 120 },
                { title: 'Subtotal', render: (_, it) => ((Number(it.price) || 0) * (it.qty || 0)).toFixed(2), width: 120 },
              ]}
            />
          ),
          rowExpandable: (record: Order) => Array.isArray(record.items) && record.items.length > 0,
        }}
      />

      <Drawer
        title={`${mode === 'view' ? 'View' : 'Edit'} Order${currentId ? ` #${currentId}` : ''}`}
        width={760}
        open={open}
        onClose={() => setOpen(false)}
        forceRender
      >
        <Form
          key={currentId ?? 'none'}
          form={form}
          layout="vertical"
          disabled={detailLoading || mode === 'view'}
          preserve={false}
        >
          <Form.Item label="User ID" name="user" rules={[{ required: true, message: 'User is required' }]}>
            <InputNumber style={{ width: '100%' }} min={1} />
          </Form.Item>

          <Form.Item label="Status" name="status" rules={[{ required: true, message: 'Status is required' }]}>
            <Select
              options={[
                { value: 'pending', label: 'pending' },
                { value: 'paid', label: 'paid' },
                { value: 'cancelled', label: 'cancelled' },
              ]}
            />
          </Form.Item>

          <Form.Item label="Created" name="created_at">
            <Input disabled value={fmt(Form.useWatch('created_at', form))} />
          </Form.Item>

          <Divider />

          <Typography.Title level={5} style={{ marginTop: 0 }}>Items</Typography.Title>
          <Form.List name="items" rules={[{ validator: async (_, value) => {
            if (!value || value.length === 0) return;
          }}]}>
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...rest }) => (
                  <Space key={key} align="baseline" style={{ display: 'flex', marginBottom: 8 }}>
                    <Form.Item name={[name, 'id']} style={{ display: 'none' }}>
                      <Input />
                    </Form.Item>
                    <Form.Item
                      {...rest}
                      label="Product"
                      name={[name, 'product']}
                      rules={[{ required: true, message: 'Product is required' }]}
                    >
                      <InputNumber min={1} style={{ width: 120 }} />
                    </Form.Item>
                    <Form.Item
                      {...rest}
                      label="Qty"
                      name={[name, 'qty']}
                      rules={[{ required: true, message: 'Qty is required' }]}
                    >
                      <InputNumber min={0} style={{ width: 90 }} />
                    </Form.Item>
                    <Form.Item
                      {...rest}
                      label="Price"
                      name={[name, 'price']}
                      rules={[{ required: true, message: 'Price is required' }]}
                    >
                      <InputNumber min={0} step="0.01" style={{ width: 140 }} />
                    </Form.Item>
                    <Form.Item label="Subtotal">
                      <Input
                        disabled
                        value={(() => {
                          const it = (form.getFieldValue(['items', name]) || {}) as OrderItem;
                          return (((Number(it?.price) || 0) * (Number((it as any)?.qty) || 0))).toFixed(2);
                        })()}
                        style={{ width: 120 }}
                      />
                    </Form.Item>
                    <Button
                      danger
                      type="text"
                      onClick={() => remove(name)}
                      icon={<MinusCircleOutlined />}
                    />
                  </Space>
                ))}
                <Button type="dashed" onClick={() => add({ product: 0, qty: 1, price: '0' })} icon={<PlusOutlined />}>
                  Add item
                </Button>
              </>
            )}
          </Form.List>

          <div style={{ textAlign: 'right', marginTop: 12, fontWeight: 600 }}>
            Total: {liveTotal.toFixed(2)}
          </div>

          {mode === 'edit' && (
            <Space style={{ marginTop: 12 }}>
              <Button type="primary" onClick={save} loading={saving}>Save</Button>
            </Space>
          )}
        </Form>
      </Drawer>
    </div>
  );
}
