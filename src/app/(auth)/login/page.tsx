'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/providers';

export default function LoginPage() {
  const { login } = useAuth();
  const r = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      // send 'username' to backend
      await login(email /* <- UI value */, password);
      r.replace('/');
    } catch (e: any) {
      setErr(e?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={styles.wrap}>
      <section style={styles.card}>
        <h1 style={styles.title}>Sign in</h1>
        <form onSubmit={onSubmit} style={styles.form}>
          <label style={styles.label}>
            Username
            <input
              type="text"
              placeholder="Enter username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={styles.input}
            />
          </label>

          <label style={styles.label}>
            Password
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={styles.input}
            />
          </label>

          {err && (
            <div role="alert" style={styles.error}>
              {err}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              ...styles.button,
              ...(loading ? styles.buttonDisabled : null),
            }}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </section>
    </main>
  );
}

const styles: { [k: string]: React.CSSProperties } = {
  wrap: {
    minHeight: '100dvh',
    display: 'grid',
    placeItems: 'center',
    background:
      'linear-gradient(180deg, rgba(32,33,36,1) 0%, rgba(24,25,28,1) 100%)',
    padding: 16,
    fontFamily:
      '-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif',
  },
 card: {
  width: '100%',
  maxWidth: 380,
  background: '#1f2227',
  border: '1px solid #2a2e34',
  borderRadius: 16,
  boxShadow: '0 8px 28px rgba(0,0,0,.35)',
  padding: 24,
  color: '#eaecef',
},

  title: {
    margin: '4px 0 16px',
    fontSize: 22,
    fontWeight: 700,
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  form: { display: 'grid', gap: 12 },
  label: { display: 'grid', gap: 6, fontSize: 13, color: '#c8ccd0' },
  input: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: 10,
    border: '1px solid #343a40',
    background: '#15181c',
    color: '#eaecef',
    outline: 'none',
    transition: 'border-color .2s, box-shadow .2s',
  },
  error: {
    background: '#2a1b1c',
    color: '#ffb4b4',
    border: '1px solid #5b2b30',
    padding: '10px 12px',
    borderRadius: 10,
    fontSize: 13,
  },
  button: {
    width: '100%',
    padding: '12px 14px',
    borderRadius: 12,
    border: '1px solid #3b82f6',
    background:
      'linear-gradient(180deg, rgba(59,130,246,1) 0%, rgba(37,99,235,1) 100%)',
    color: '#fff',
    fontWeight: 700,
    letterSpacing: 0.3,
    cursor: 'pointer',
    transition: 'transform .06s ease, opacity .2s',
  },
  buttonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
};
