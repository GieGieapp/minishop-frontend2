import { getAccess } from '@/lib/auth';

const BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || '').replace(/\/+$/, ''); // ex: http://127.0.0.1:8000/api

export function api(path: string, init: RequestInit = {}) {

  const url = /^https?:\/\//i.test(path)
    ? path
    : `${BASE}/${String(path).replace(/^\/+/, '')}`;


  const headers = new Headers(init.headers as HeadersInit);


  const token = getAccess?.();
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }


  const hasBody = init.body != null;
  const isForm = typeof FormData !== 'undefined' && init.body instanceof FormData;
  const isBlob = typeof Blob !== 'undefined' && init.body instanceof Blob;
  if (hasBody && !isForm && !isBlob && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  return fetch(url, {
    ...init,
    headers,
    credentials: 'omit',
  });
}
