// Centralized API client for MediSync backend
const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? "https://YOUR_BACKEND_URL";

const TOKEN_KEY = "medisync_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) window.localStorage.setItem(TOKEN_KEY, token);
  else window.localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  detail: unknown;
  constructor(status: number, message: string, detail?: unknown) {
    super(message);
    this.status = status;
    this.detail = detail;
  }
}

function parseErrorMessage(data: unknown, fallback: string): string {
  if (!data || typeof data !== "object") return fallback;
  const d = data as { detail?: unknown; message?: unknown };
  if (typeof d.detail === "string") return d.detail;
  if (Array.isArray(d.detail)) {
    return d.detail
      .map((e: { loc?: unknown[]; msg?: string }) => {
        const field = Array.isArray(e.loc) ? e.loc.slice(1).join(".") : "";
        return field ? `${field}: ${e.msg}` : e.msg;
      })
      .filter(Boolean)
      .join(", ") || fallback;
  }
  if (typeof d.message === "string") return d.message;
  return fallback;
}

type RequestOpts = {
  method?: string;
  body?: unknown;
  form?: URLSearchParams;
  headers?: Record<string, string>;
  auth?: boolean;
};

let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(fn: () => void) {
  onUnauthorized = fn;
}

export async function apiRequest<T = unknown>(path: string, opts: RequestOpts = {}): Promise<T> {
  const { method = "GET", body, form, headers = {}, auth = true } = opts;
  const h: Record<string, string> = { ...headers };
  let payload: BodyInit | undefined;

  if (form) {
    h["Content-Type"] = "application/x-www-form-urlencoded";
    payload = form.toString();
  } else if (body !== undefined) {
    h["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }

  if (auth) {
    const t = getToken();
    if (t) h["Authorization"] = `Bearer ${t}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, { method, headers: h, body: payload });

  if (res.status === 401 && auth) {
    onUnauthorized?.();
    throw new ApiError(401, "Session expired. Please sign in again.");
  }

  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try { data = JSON.parse(text); } catch { data = text; }
  }

  if (!res.ok) {
    throw new ApiError(res.status, parseErrorMessage(data, `Request failed (${res.status})`), data);
  }

  return data as T;
}

export const api = {
  get: <T>(path: string) => apiRequest<T>(path, { method: "GET" }),
  post: <T>(path: string, body?: unknown) => apiRequest<T>(path, { method: "POST", body }),
  patch: <T>(path: string, body?: unknown) => apiRequest<T>(path, { method: "PATCH", body }),
  del: <T>(path: string) => apiRequest<T>(path, { method: "DELETE" }),
  postForm: <T>(path: string, form: URLSearchParams, auth = false) =>
    apiRequest<T>(path, { method: "POST", form, auth }),
};

// ---------- Types ----------
export type Role = "PATIENT" | "CAREGIVER" | "ADMIN";

export interface AuthUser {
  id: string;
  full_name: string;
  email: string;
  role: Role;
  created_at: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
}

export interface Patient {
  id: string;
  full_name: string;
  date_of_birth: string;
  gender: string;
  height_cm: number | null;
  weight_kg: number | null;
  blood_group: string | null;
  allergies: string | null;
  medical_conditions: string | null;
  wake_up_time: string;
  breakfast_time: string;
  lunch_time: string;
  dinner_time: string;
  sleep_time: string;
  created_at: string;
  updated_at: string;
}

export type PatientCreate = Omit<Patient, "id" | "created_at" | "updated_at">;

export interface Medication {
  id: string;
  name: string;
  dosage_amount: number;
  dosage_unit: string;
  frequency_per_day: number;
  duration_days: number;
  route: string;
  with_food: boolean;
  empty_stomach: boolean;
  bedtime_only: boolean;
  start_date: string;
  end_date: string;
  notes: string | null;
  created_at: string;
}

export type MedicationCreate = Omit<Medication, "id" | "end_date" | "created_at">;

export interface ScheduleItem {
  medication_id: string;
  medication_name: string;
  dose_index: number;
  scheduled_time: string;
}

export interface Conflict {
  conflict: boolean;
  reason: string;
  medication_a_id: string | null;
  medication_b_id: string | null;
  required_gap_hours: number;
  detail: string | null;
}

export interface ScheduleResponse {
  success: boolean;
  schedule: ScheduleItem[];
  conflict: Conflict | null;
}

export type LogStatus = "pending" | "taken" | "missed" | "skipped" | "late";

export interface MedicationLog {
  id: string;
  medication_id: string;
  dose_index: number;
  scheduled_time: string;
  taken_time: string | null;
  status: LogStatus;
  notes: string | null;
  created_at: string;
}

export interface AdherenceStats {
  total_doses: number;
  eligible_doses: number;
  taken: number;
  missed: number;
  late: number;
  skipped: number;
  pending: number;
  adherence_rate: number;
}

export interface Notification {
  id: string;
  medication_log_id: string;
  notification_type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}
