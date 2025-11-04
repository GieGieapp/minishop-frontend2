export type Role = 'ADMIN' | 'MANAGER' | 'STAFF';


export type Action = 'view' | 'edit';
export type Resource = 'USERS' | 'PRODUCTS' | 'ORDERS' | 'INVITES';


export const Permissions = {
  USERS:    { view: ['ADMIN'],                     edit: ['ADMIN'] },
  PRODUCTS: { view: ['ADMIN','MANAGER','STAFF'],   edit: ['ADMIN','MANAGER'] },
  ORDERS:   { view: ['ADMIN','MANAGER'],           edit: ['ADMIN'] },
  INVITES:  { view: ['ADMIN','MANAGER'],           edit: ['ADMIN','MANAGER'] },
} as const satisfies Record<Resource, { view: readonly Role[]; edit: readonly Role[] }>;


const normRole = (r?: string | null): Role | null => {
  const up = (r || '').toUpperCase();
  return (['ADMIN','MANAGER','STAFF'] as const).includes(up as Role) ? (up as Role) : null;
};

export function can(role: string | Role | null | undefined, resource: Resource, action: Action): boolean {
  const rr = normRole(role as string);
  if (!rr) return false;
  const allowed = Permissions[resource][action];
  return allowed.includes(rr);
}

export const canView = (role: string | Role | null | undefined, resource: Resource) =>
  can(role, resource, 'view');

export const canEdit = (role: string | Role | null | undefined, resource: Resource) =>
  can(role, resource, 'edit');


export function allowedActions(role: string | Role | null | undefined, resource: Resource): Action[] {
  return (['view','edit'] as const).filter(a => can(role, resource, a)) as Action[];
}
