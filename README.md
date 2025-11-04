A small Next.js (App Router) admin UI using Ant Design to **view & edit**:

* Orders: list, view (read-only), edit selected fields via `PATCH`
* Products: list, view (read-only), edit via `PATCH`

The UI talks to a Django REST Framework (DRF) backend using simple REST endpoints.

No create/delete screens are included. No icons or fancy styling required.

---

## Folder layout (suggested)

```
src/
  app/
    (app)/
      orders/page.tsx          # view + edit drawer (orders)
      products/page.tsx        # view + edit drawer (products)
  lib/
    api.ts                     # fetch wrapper (you provide)
    auth.ts (optional)         # auth context (if used)
    rbac.ts (optional)         # role helpers (if used)
```

---

## API contract (DRF)

### Orders

* `GET /orders/` → list (optionally supports `?search=` and `?ordering=`)
* `GET /orders/{id}/` → detail
* `PATCH /orders/{id}/` → partial update (e.g. `{"user": 1, "status": "paid"}`)

**Order shape** (example):

```json
{
  "id": 42,
  "user": 1,
  "status": "pending",
  "items": [
    { "id": 10, "product": 7, "qty": 2, "price": "129.00" }
  ],
  "created_at": "2025-11-03T18:24:28.862334Z",
  "updated_at": "2025-11-03T18:29:11.002334Z"
}
```

### Products

* `GET /catalog/products/` → list
* `GET /catalog/products/{id}/` → detail
* `PATCH /catalog/products/{id}/` → partial update (e.g. `{"name": "X", "price": 99.99, "stock": 10}`)

**Product shape** (example):

```json
{
  "id": 7,
  "sku": "SKU-001",
  "name": "Sample",
  "price": 129.0,
  "stock": 20
}
```

> If your backend is mounted under `/api/`, add a proxy/rewrite in Next.js or update the base paths in the pages.

---

## Frontend requirements

* Node 18+
* Next.js 14+ (App Router). The sample was tested on Next 16 (Turbopack).
* Ant Design v5

Install:

```bash
pnpm i
# or npm i / yarn
```

Dev server:

```bash
pnpm dev
# or npm run dev
```

By default the pages call relative paths:

* Orders: `/orders/` and `/orders/{id}/`
* Products: `/catalog/products/` and `/catalog/products/{id}/`

Configure your fetch wrapper (`src/lib/api.ts`) to prepend the backend origin (or add a Next.js rewrite).

Example `next.config.js` rewrite to a DRF backend at `http://localhost:8000`:

```js
module.exports = {
  async rewrites() {
    return [
      { source: '/orders/:path*', destination: 'http://localhost:8000/api/orders/:path*' },
      { source: '/catalog/:path*', destination: 'http://localhost:8000/api/catalog/:path*' },
    ];
  },
};
```

Or in `api.ts`:

```ts
const BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:8000/api';
export async function api(path: string, init?: RequestInit) {
  const url = path.startsWith('http') ? path : `${BASE}${path.startsWith('/') ? '' : '/'}${path}`;
  return fetch(url, { headers: { 'Content-Type': 'application/json' }, ...init });
}
```

---

## How to run end-to-end

1. **Run DRF backend**

   * Expose the endpoints above.
   * Enable CORS for your Next.js origin, or use Next rewrites.

2. **Run Next.js**

   * Set `NEXT_PUBLIC_API_BASE` if you don’t use rewrites.
   * `pnpm dev` and open `http://localhost:3000/(app)/orders` and `http://localhost:3000/(app)/products`.

3. **Permissions**

   * Allow `GET` for all roles that should view.
   * Allow `PATCH` only for roles that can edit.
   * If you use auth/roles in the UI, return `role`/`groups` from `GET /accounts/me/` and store them in your `auth.ts`.

---

## CURL quick tests (backend)

### Orders

```bash
# list
curl -s http://localhost:8000/api/orders/ | jq

# detail
curl -s http://localhost:8000/api/orders/42/ | jq

# edit (PATCH)
curl -s -X PATCH http://localhost:8000/api/orders/42/ \
  -H 'Content-Type: application/json' \
  -d '{"status":"paid"}' | jq
```

### Products

```bash
# list
curl -s http://localhost:8000/api/catalog/products/ | jq

# detail
curl -s http://localhost:8000/api/catalog/products/7/ | jq

# edit (PATCH)
curl -s -X PATCH http://localhost:8000/api/catalog/products/7/ \
  -H 'Content-Type: application/json' \
  -d '{"price": 119.99, "stock": 15}' | jq
```

---

## UI behavior notes

* **Drawer View**: read-only (uses `Descriptions` or disabled `Form`), no Save button.
* **Drawer Edit**: `Form` enabled; Save triggers `PATCH`. No create/delete buttons.
* **AntD `useForm` warning**: avoid by keeping a bound `Form` instance (either render `<Form form={form} component={false} />` or render the editing `Form` when in edit mode).
* **Loading**: basic error handling via `message.error`.

---

## Troubleshooting

* **“Instance created by `useForm` is not connected …”**
  Ensure there’s a `<Form form={form} ...>` mounted when you call `form.setFieldsValue(...)`. If you show read-only with `Descriptions`, keep a hidden binder:
  `<Form form={form} component={false} />` somewhere inside the Drawer.

* **404/500 from API**
  Check rewrites or `NEXT_PUBLIC_API_BASE`. Confirm DRF URLs and trailing slashes.

* **CORS**
  Prefer rewrites. If calling the backend origin directly, enable CORS in DRF.

---

## License

Internal project scaffold. Use at your discretion.
