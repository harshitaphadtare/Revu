import { getToken, saveAuth, type PublicUser } from "./auth";

const rawBase = (import.meta as any).env?.VITE_API_URL || "http://localhost:8000";
const baseURL: string = String(rawBase).replace(/\/$/, "");

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

async function request<T>(path: string, options: {
  method?: HttpMethod;
  body?: any;
  auth?: boolean;
} = {}): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (options.auth) {
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch(`${baseURL}${path}`, {
    method: options.method || "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const msg = data?.detail || data?.message || `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return data as T;
}

export type TokenResponse = {
  access_token: string;
  token_type: string;
  user: PublicUser;
};

export async function apiSignup(payload: { name?: string; email: string; password: string; }) {
  const result = await request<TokenResponse>("/auth/signup", { method: "POST", body: payload });
  saveAuth(result.access_token, result.user);
  return result;
}

export async function apiSignin(payload: { email: string; password: string; }) {
  const result = await request<TokenResponse>("/auth/signin", { method: "POST", body: payload });
  saveAuth(result.access_token, result.user);
  return result;
}

export async function apiMe() {
  return request<PublicUser>("/auth/me", { auth: true });
}

export { baseURL };
