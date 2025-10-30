import { getToken, saveAuth, saveUser, type PublicUser } from "./auth";

const rawBase = (import.meta as any).env?.VITE_API_URL || "http://localhost:8000";
const baseURL: string = String(rawBase).replace(/\/$/, "");

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
export type ApiError = Error & { status?: number; payload?: unknown };

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
    const err = new Error(msg) as ApiError;
    err.status = res.status;
    err.payload = data;
    throw err;
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

export async function apiUpdateProfile(payload: { name?: string | null; email?: string; }) {
  const user = await request<PublicUser>("/api/me", { method: "PATCH", body: payload, auth: true });
  saveUser(user);
  return user;
}

export async function apiChangePassword(payload: { current_password: string; new_password: string; }) {
  return request<{ detail: string }>("/api/auth/change-password", { method: "POST", body: payload, auth: true });
}

export { baseURL };

// ---- Scraping API ----

export type StartScrapeResponse = { job_id: string };
export type ScrapeStatusResponse = {
  job_id: string;
  state: "PENDING" | "PROGRESS" | "SUCCESS" | "FAILURE" | "REVOKED" | string;
  progress: number;
  result?: any;
  count?: number | null;
  product?: any;
  error?: string | null;
};
export type CancelResponse = { job_id: string; cancel_requested: boolean };
export type LockStatus = { locked: boolean; owner_job_id?: string | null; ttl?: number | null };

export async function apiStartScrape(payload: { url: string }) {
  return request<StartScrapeResponse>(`/start-scrape`, { method: "POST", body: payload, auth: true });
}

export async function apiScrapeStatus(jobId: string) {
  return request<ScrapeStatusResponse>(`/scrape-status/${encodeURIComponent(jobId)}`);
}

export async function apiCancelScrape(jobId: string) {
  return request<CancelResponse>(`/cancel-scrape/${encodeURIComponent(jobId)}`, { method: "POST" });
}

export async function apiLockStatus() {
  return request<LockStatus>(`/scrape-lock-status`);
}

// ---- Analyze API ----
export async function apiAnalyze(body: any) {
  return request<any>(`/analyze/`, { method: "POST", body });
}
