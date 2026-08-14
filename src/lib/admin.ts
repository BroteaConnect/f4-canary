// admin.ts — the panel's only way to change who may enter what.
//
// Every call goes to this app's PocketBase, authenticated with the ordinary
// session token the auth brick already installed. PocketBase is what holds the
// Supabase service key and what checks the caller is a superadmin: the browser
// never sees the key, and a stolen session is still just a session.
//
// Dependency-free, like pb.ts and auth.ts.

import { authToken, pbUrl } from './pb';

export interface BroteaRoles {
  superadmin?: boolean;
  staff?: boolean;
  apps?: Record<string, string>;
}

export interface Identity {
  email: string;
  created: string;
  last_sign_in: string | null;
  disabled: boolean;
  brotea: BroteaRoles;
}

export class AdminError extends Error {
  status: number;
  constructor(message: string, status = 0) {
    super(message);
    this.status = status;
  }
}

async function call<T>(action: string, body: object = {}): Promise<T> {
  const res = await fetch(`${pbUrl()}/api/brotea-admin/${action}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: authToken() ?? '' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new AdminError((data as { message?: string })?.message || `admin ${res.status}`, res.status);
  return data as T;
}

export const listIdentities = () => call<{ users: Identity[] }>('list').then((r) => r.users);

/** `role` is per app; `superadmin` is fleet-wide and takes no app. */
export const grant = (email: string, app: string, role: 'admin' | 'member') =>
  call<{ ok: true }>('grant', { email, app, role });

export const grantSuperadmin = (email: string) =>
  call<{ ok: true }>('grant', { email, superadmin: true });

/**
 * Without `app`, this removes every role. It returns `sweep_required` because
 * upstream is only half the job: the local projection in every OTHER app keeps
 * the old role until that person signs in again there. A browser cannot reach
 * those instances, so the honest thing is to say so rather than to imply the
 * person is out.
 */
export const revoke = (email: string, app?: string) =>
  call<{ ok: true; sweep_required?: boolean }>('revoke', app ? { email, app } : { email });

export const invite = (email: string) => call<{ created: true; mailed: boolean }>('invite', { email });

/** Every app this fleet's identities are known to hold a role in, sorted. */
export function knownApps(identities: Identity[]): string[] {
  const set = new Set<string>();
  for (const i of identities) for (const app of Object.keys(i.brotea?.apps ?? {})) set.add(app);
  return [...set].sort();
}

/** What this identity holds, as short labels a table can render. */
export function rolesOf(identity: Identity): string[] {
  const b = identity.brotea ?? {};
  const out: string[] = [];
  if (b.superadmin === true) out.push('superadmin');
  if (b.staff === true) out.push('staff');
  for (const [app, role] of Object.entries(b.apps ?? {})) {
    // An empty role is a deliberate "everywhere except here" for staff, and it
    // must read as an exclusion rather than disappear.
    out.push(role ? `${app}=${role}` : `${app}=—`);
  }
  return out;
}
