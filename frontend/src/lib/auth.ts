// Simple auth storage helpers
export type PublicUser = {
  id: string;
  email: string;
  name?: string | null;
  is_active: boolean;
  email_verified?: boolean | null;
  created_at: string;
  updated_at: string;
};

const TOKEN_KEY = "revu.token";
const USER_KEY = "revu.user";

export function saveAuth(token: string, user: PublicUser) {
  try {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    try { window.dispatchEvent(new Event("revu:auth-changed")); } catch {}
  } catch {}
}

export function saveUser(user: PublicUser) {
  try {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    try { window.dispatchEvent(new Event("revu:auth-changed")); } catch {}
  } catch {}
}

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function getUser(): PublicUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as PublicUser) : null;
  } catch {
    return null;
  }
}

export function clearAuth() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    try { window.dispatchEvent(new Event("revu:auth-changed")); } catch {}
  } catch {}
}

export function isAuthenticated(): boolean {
  return !!getToken();
}
