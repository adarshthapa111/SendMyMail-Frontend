import type { ConnectionState } from '../store/slices/integrationsSlice';

const CRED_NS = 'sendmymail.integrations.cred.';
const CONN_NS = 'sendmymail.integrations.conn.';

export function saveCredentials(id: string, creds: Record<string, string>): void {
  localStorage.setItem(CRED_NS + id, JSON.stringify(creds));
}

export function loadCredentials(id: string): Record<string, string> | null {
  const raw = localStorage.getItem(CRED_NS + id);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return null;
  }
}

export function clearCredentials(id: string): void {
  localStorage.removeItem(CRED_NS + id);
  localStorage.removeItem(CONN_NS + id);
}

export function saveConnectionMeta(id: string, conn: ConnectionState): void {
  localStorage.setItem(CONN_NS + id, JSON.stringify(conn));
}

/**
 * Read all connection metadata on app startup so the screen shows connected
 * state across reloads. Credentials stay in their own namespaced keys —
 * loaded on demand (modal open, send action) so they never sit in Redux.
 */
export function loadAllConnections(): Record<string, ConnectionState> {
  const out: Record<string, ConnectionState> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key?.startsWith(CONN_NS)) continue;
    const id = key.slice(CONN_NS.length);
    const raw = localStorage.getItem(key);
    if (!raw) continue;
    try {
      out[id] = JSON.parse(raw) as ConnectionState;
    } catch {
      // skip corrupt entries
    }
  }
  return out;
}
