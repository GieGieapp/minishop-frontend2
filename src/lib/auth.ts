export const ACCESS_KEY = 'JWT_ACCESS';

let memToken: string | null = null;
const listeners = new Set<(t: string | null) => void>();

function emit(t: string | null) {
  for (const cb of listeners) cb(t);
}

export function getAccess(): string | null {
  if (memToken) return memToken;
  if (typeof window === 'undefined') return null;
  try {
    memToken = localStorage.getItem(ACCESS_KEY);
  } catch {}
  return memToken;
}

export function setAccess(t: string) {
  memToken = t || null;
  if (typeof window !== 'undefined') {
    try { localStorage.setItem(ACCESS_KEY, t); } catch {}
  }
  emit(memToken);
}

export function clearAccess() {
  memToken = null;
  if (typeof window !== 'undefined') {
    try { localStorage.removeItem(ACCESS_KEY); } catch {}
  }
  emit(memToken);
}

export function onAccessChange(cb: (t: string | null) => void): () => void {
  listeners.add(cb);
  // initial push
  cb(getAccess());
  return () => listeners.delete(cb);
}

// keep tabs in sync
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key !== ACCESS_KEY) return;
    memToken = (e.newValue as string) || null;
    emit(memToken);
  });
}
