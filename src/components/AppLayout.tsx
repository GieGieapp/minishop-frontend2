'use client';
import { Layout } from 'antd';
import NavMenu from './NavMenu';

const { Header, Sider, Content } = Layout;

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider width={240} collapsedWidth={64}>
        <div style={{ color: '#fff', padding: 16, fontWeight: 600 }}>Admin Portal</div>
        <NavMenu />
      </Sider>
      <Layout>
        <Header style={{ background: '#fff', padding: '0 16px' }}></Header>
        <Content style={{ margin: 16 }}>{children}</Content>
      </Layout>
    </Layout>
  );
}
