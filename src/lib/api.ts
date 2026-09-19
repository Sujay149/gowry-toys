import { supabase, FUNCTIONS, REPORTS_BUCKET } from '@/lib/supabase';
import type {
  ApiError,
  AttendanceRecord,
  CompanySettings,
  Profile,
  Report,
  Role,
  Shift,
  Worker,
  WorkerInput,
} from '@/lib/types';

function toApiError(raw: { code?: string; message?: string }): ApiError {
  return {
    code: raw.code ?? 'SERVER_ERROR',
    message: raw.message ?? 'Something went wrong. Please try again.',
  };
}

export function todayString(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

// First day of the month AFTER the given YYYY-MM. Used as an exclusive upper
// bound so months with fewer than 31 days don't produce invalid dates like
// '2026-09-31' (which crashes the query and mislabels detail pages as not found).
export function monthNextStart(month: string): string {
  const [y, m] = month.split('-').map((p) => parseInt(p, 10));
  const d = new Date(Date.UTC(y, m, 1));
  return d.toISOString().slice(0, 10);
}

// ---------- Workers ----------

export async function fetchWorkers(includeInactive = false): Promise<Worker[]> {
  let query = supabase
    .from('workers')
    .select('*')
    .is('deleted_at', null)
    .order('worker_id', { ascending: true });
  if (!includeInactive) {
    query = query.eq('active', true);
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data as Worker[]) ?? [];
}

export async function fetchWorkerByWorkerId(workerId: string): Promise<Worker | null> {
  const { data, error } = await supabase
    .from('workers')
    .select('*')
    .eq('worker_id', workerId)
    .is('deleted_at', null)
    .maybeSingle();
  if (error) throw error;
  return (data as Worker) ?? null;
}

export async function createWorker(input: WorkerInput): Promise<Worker> {
  const { data, error } = await supabase.from('workers').insert(input).select().single();
  if (error) throw error;
  return data as Worker;
}

export async function updateWorker(id: string, patch: Partial<WorkerInput> & { active?: boolean }) {
  const { error } = await supabase.from('workers').update(patch).eq('id', id);
  if (error) throw error;
}

// Soft delete: the worker row is kept (so all attendance records and reports
// keep working), hidden everywhere in the app, and its QR can no longer be
// scanned (active is set to false, which mark-attendance rejects).
export async function deleteWorker(id: string) {
  const { error } = await supabase
    .from('workers')
    .update({ active: false, deleted_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

// ---------- Profiles (admin only) ----------

export async function fetchSupervisorProfiles(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, active, created_at')
    .eq('role', 'supervisor')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data as Profile[]) ?? [];
}

export async function updateProfile(id: string, patch: { role?: Role; active?: boolean }) {
  const { error } = await supabase.from('profiles').update(patch).eq('id', id);
  if (error) throw error;
}

// ---------- Shifts ----------

export async function fetchShifts(): Promise<Shift[]> {
  const { data, error } = await supabase
    .from('shifts')
    .select('*')
    .eq('active', true)
    .order('shift_code', { ascending: true });
  if (error) throw error;
  return (data as Shift[]) ?? [];
}

// ---------- Attendance ----------

const attendanceSelect = `
  *,
  worker:workers(worker_id, name, department),
  shift:shifts(name, shift_code)
`;

export async function fetchAttendanceForDate(date: string): Promise<AttendanceRecord[]> {
  const { data, error } = await supabase
    .from('attendance')
    .select(attendanceSelect)
    .eq('attendance_date', date)
    .order('marked_at', { ascending: true });
  if (error) throw error;
  return (data as AttendanceRecord[]) ?? [];
}

export async function fetchAttendanceForMonth(month: string): Promise<AttendanceRecord[]> {
  const start = `${month}-01`;
  const { data, error } = await supabase
    .from('attendance')
    .select(attendanceSelect)
    .gte('attendance_date', start)
    .lt('attendance_date', monthNextStart(month))
    .order('attendance_date', { ascending: true });
  if (error) throw error;
  return (data as AttendanceRecord[]) ?? [];
}

export interface MonthlySimpleRow {
  worker_id: string;
  attendance_date: string;
  shift?: { shift_code?: string | null } | null;
}

export async function fetchMonthlyAttendanceRows(month: string): Promise<MonthlySimpleRow[]> {
  const { data, error } = await supabase
    .from('attendance')
    .select('worker_id, attendance_date, shift:shifts(shift_code)')
    .gte('attendance_date', `${month}-01`)
    .lt('attendance_date', monthNextStart(month));
  if (error) throw error;
  return (data as MonthlySimpleRow[]) ?? [];
}

export async function fetchWorkerMonthAttendance(
  workerId: string,
  month: string
): Promise<MonthlySimpleRow[]> {
  const { data, error } = await supabase
    .from('attendance')
    .select('worker_id, attendance_date, shift:shifts(shift_code)')
    .eq('worker_id', workerId)
    .gte('attendance_date', `${month}-01`)
    .lt('attendance_date', monthNextStart(month));
  if (error) throw error;
  return (data as MonthlySimpleRow[]) ?? [];
}

export async function markAttendance(payload: {
  worker_id: string;
  shift_id: string;
}): Promise<{ success: boolean; message: string; data?: Record<string, unknown> }> {
  const { data, error } = await supabase.functions.invoke(FUNCTIONS.markAttendance, {
    body: payload,
  });
  if (error) {
    throw error;
  }
  return data as { success: boolean; message: string; data?: Record<string, unknown> };
}

// ---------- Reports ----------

export async function fetchReports(): Promise<Report[]> {
  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .order('generated_at', { ascending: false });
  if (error) throw error;
  return (data as Report[]) ?? [];
}

export async function generateMonthlyReport(
  month: string
): Promise<{ success: boolean; report?: Report; url?: string; message?: string; code?: string }> {
  const { data, error } = await supabase.functions.invoke(FUNCTIONS.generateMonthlyReport, {
    body: { month },
  });
  if (error) {
    throw error;
  }
  return data as { success: boolean; report?: Report; url?: string; message?: string; code?: string };
}

export async function getReportSignedUrl(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(REPORTS_BUCKET)
    .createSignedUrl(path, 3600);
  if (error || !data) return null;
  return data.signedUrl;
}

// ---------- Settings ----------

export async function fetchCompanySettings(): Promise<CompanySettings | null> {
  const { data, error } = await supabase.from('company_settings').select('*').limit(1).maybeSingle();
  if (error) return null;
  return (data as CompanySettings) ?? null;
}

// ---------- Summary ----------

export interface TodaySummary {
  present: number;
  shift1: number;
  shift2: number;
}

export function summarizeToday(records: AttendanceRecord[]): TodaySummary {
  const presentWorkers = new Set<string>();

  let shift1 = 0;
  let shift2 = 0;

  for (const r of records) {
    if (r.worker_id) presentWorkers.add(r.worker_id);

    if (r.shift?.shift_code === 'SHIFT_1') shift1 += 1;
    else if (r.shift?.shift_code === 'SHIFT_2') shift2 += 1;
  }

  return {
    present: presentWorkers.size,
    shift1,
    shift2,
  };
}

export function monthLabel(month: string): string {
  const [y, m] = month.split('-');
  const names = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];
  return `${names[Number(m) - 1]} ${y}`;
}

export function currentMonth(): string {
  const now = new Date();
  const s = now.toISOString();
  return s.slice(0, 7);
}

export function shiftMonth(month: string, dir: 1 | -1): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 1 + dir, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}