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
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    } else {
      console.error("API request requires auth but no token found");
    }
  }

  const fullUrl = `${baseURL}${path}`;
  console.log(`API Request: ${options.method || "GET"} ${fullUrl}`, options.body ? { body: options.body } : '');

  try {
    const res = await fetch(fullUrl, {
      method: options.method || "GET",
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    const text = await res.text();
    const data = text ? JSON.parse(text) : null;

    console.log(`API Response: ${options.method || "GET"} ${fullUrl}`, { status: res.status, data });

    if (!res.ok) {
      const msg = data?.detail || data?.message || `Request failed (${res.status})`;
      const err = new Error(msg) as ApiError;
      err.status = res.status;
      err.payload = data;
      console.error(`API Error: ${options.method || "GET"} ${fullUrl}`, { status: res.status, message: msg, payload: data });
      throw err;
    }
    return data as T;
  } catch (error) {
    if (error instanceof Error && 'status' in error) {
      // Already handled API error, rethrow
      throw error;
    }
    // Network or other error
    console.error(`Network Error: ${options.method || "GET"} ${fullUrl}`, error);
    throw new Error(`Network error: Unable to reach ${baseURL}. Is the backend running?`);
  }
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
  analysis?: any;
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

// ---- Analysis Store API ----
export async function apiSaveAnalysis(payload: {
  job_id: string;
  url: string;
  product: any;
  reviews: any[];
  analysis: any;
}) {
  return request<{ ok: boolean; job_id: string }>(`/analysis/`, { method: "POST", body: payload, auth: true });
}

export async function apiGetAnalysis(jobId: string) {
  return request<any>(`/analysis/${encodeURIComponent(jobId)}`, { method: "GET", auth: true });
}

// Fetch all saved analyses (history)
export async function apiGetAllAnalyses() {
  return request<any[]>(`/analysis/`, { method: "GET", auth: true });
}

// Delete a saved analysis by job id
export async function apiDeleteAnalysis(jobId: string) {
  return request<{ ok: boolean }>(`/analysis/${encodeURIComponent(jobId)}`, { method: "DELETE", auth: true });
}
