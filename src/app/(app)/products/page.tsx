'use client';
import '@ant-design/v5-patch-for-react-19';
import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Table, Typography, Drawer, Space, Button,
  Form, Input, InputNumber, Skeleton, message
} from 'antd';
import { api } from '@/lib/api';
import { canEdit } from '@/lib/rbac';

type Product = { id: number; sku: string; name: string; price: number; stock: number };

const norm = (v: unknown) => (String(v ?? '').replace(/[\[\]{}"]/g, '').split(/[,:]/)[0] || '').trim().toUpperCase();

export default function ProductsPage() {
  const [rows, setRows] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [currentId, setCurrentId] = useState<number | null>(null);
  const [mode, setMode] = useState<'view' | 'edit'>('view');
  const [form] = Form.useForm<Product>();
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
        data?.target_role ||
        (data?.is_superuser ? 'ADMIN' : '') ||
        (Array.isArray(data?.groups) && data.groups.length ? data.groups[0]?.name : '');
      const n = norm(guess);
      if (n) setRole(n);
    } catch {}
  }, []);

  useEffect(() => { bootstrapRole(); }, [bootstrapRole]);

  const listUrl = '/catalog/products/';
  const detailUrl = (id: number) => `/catalog/products/${id}/`;

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

  const openDetail = async (id: number, nextMode: 'view' | 'edit' = 'view') => {
    setMode(nextMode);
    setOpen(true);
    setCurrentId(id);
    setDetailLoading(true);
    try {
      const r = await api(detailUrl(id));
      const data = await r.json().catch(() => null);
      if (!r.ok) { message.error(`Failed to load product #${id}`); return; }
      form.resetFields();
      form.setFieldsValue(data as Product);
    } catch (e: any) {
      message.error(e?.message || String(e));
    } finally {
      setDetailLoading(false);
    }
  };

  const save = useCallback(async () => {
    if (!currentId || mode !== 'edit') return;
    try {
      const v = await form.validateFields();
      setSaving(true);
      const r = await api(detailUrl(currentId), {
        method: 'PATCH',
        body: JSON.stringify({ sku: v.sku, name: v.name, price: v.price, stock: v.stock }),
      });
      const txt = await r.text().catch(() => '');
      if (!r.ok) { message.error(txt || `HTTP ${r.status}`); return; }
      message.success('Product updated');
      setOpen(false);
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
    { title: 'SKU', dataIndex: 'sku' },
    { title: 'Name', dataIndex: 'name' },
    { title: 'Price', dataIndex: 'price' },
    { title: 'Stock', dataIndex: 'stock' },
    {
      title: 'Actions', width: 160,
      render: (_: any, r: Product) => (
        <Space>
          <Button size="small" onClick={(e) => { e.stopPropagation(); openDetail(r.id, 'view'); }}>View</Button>
          {canEdit(role, 'PRODUCTS') && (
            <Button size="small" type="primary" onClick={(e) => { e.stopPropagation(); openDetail(r.id, 'edit'); }}>Edit</Button>
          )}
        </Space>
      ),
    },
  ]), [openDetail, role]);

  return (
    <div style={{ padding: 16 }}>
      <Typography.Title level={3}>Products</Typography.Title>

      <Table<Product>
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
        title={`${mode === 'view' ? 'View' : 'Edit'} Product${currentId ? ` #${currentId}` : ''}`}
        width={520}
        open={open}
        onClose={() => setOpen(false)}
        forceRender
      >
        <Form
          form={form}
          layout="vertical"
          preserve={false}
          disabled={detailLoading || mode === 'view'}
        >
          <Skeleton active loading={detailLoading} paragraph={false}>
            <Form.Item label="SKU" name="sku" rules={[{ required: true, message: 'SKU is required' }]}>
              <Input />
            </Form.Item>
            <Form.Item label="Name" name="name" rules={[{ required: true, message: 'Name is required' }]}>
              <Input />
            </Form.Item>
            <Form.Item label="Price" name="price" rules={[{ required: true, message: 'Price is required' }]}>
              <InputNumber style={{ width: '100%' }} min={0} step={0.01} />
            </Form.Item>
            <Form.Item label="Stock" name="stock" rules={[{ required: true, message: 'Stock is required' }]}>
              <InputNumber style={{ width: '100%' }} min={0} />
            </Form.Item>
          </Skeleton>

          {mode === 'edit' && (
            <Space>
              <Button type="primary" onClick={save} loading={saving}>Save</Button>
            </Space>
          )}
        </Form>
      </Drawer>
    </div>
  );
}
