export type Role = 'admin' | 'supervisor';

export interface Profile {
  id: string;
  full_name: string;
  email?: string | null;
  role: Role;
  active: boolean;
  created_at: string;
}

export interface Worker {
  id: string;
  worker_id: string;
  name: string;
  phone?: string | null;
  department?: string | null;
  designation?: string | null;
  joining_date?: string | null;
  avatar_url?: string | null;
  active: boolean;
  daily_salary?: number | null;
  created_at: string;
}

export interface WorkerInput {
  name: string;
  phone?: string;
  department?: string;
  designation?: string;
  joining_date?: string;
  avatar_url?: string | null;
  daily_salary?: number | null;
}

export interface Shift {
  id: string;
  shift_code: string;
  name: string;
  active: boolean;
}

export interface AttendanceRecord {
  id: string;
  worker_id: string;
  shift_id: string;
  attendance_date: string;
  status: string;
  marked_at: string;
  marked_by?: string | null;
  method: string;
  worker?: {
    worker_id: string;
    name: string;
    department?: string | null;
    daily_salary?: number | null;
  } | null;
  shift?: {
    name: string;
    shift_code: string;
  } | null;
}

/** Payroll data frozen into a report at generation time. Keeps historical
 * reports reproducible even if worker salaries change later. */
export interface ReportSalarySnapshot {
  month: string;
  workingDays: number;
  totalPayroll: number;
  totalWorkers: number;
  totalFullDays: number;
  totalHalfDays: number;
  totalAbsentDays: number;
  workers: {
    worker_id: string;
    name: string;
    department?: string | null;
    daily_salary?: number | null;
    shift1: number;
    shift2: number;
    fullDays: number;
    halfDays: number;
    absentDays: number;
    earned: number | null;
  }[];
}

export interface Report {
  id: string;
  report_type: string;
  report_month?: string | null;
  file_name: string;
  storage_path: string;
  generated_by?: string | null;
  generated_at: string;
  payroll_total?: number | null;
  salary_snapshot?: ReportSalarySnapshot | null;
}

export interface CompanySettings {
  id: string;
  company_name: string;
  address: string;
  logo_url?: string | null;
}

export interface AttendanceCounts {
  totalWorkers: number;
  shift1: number;
  shift2: number;
  total: number;
}

export interface WorkerMonthlySummary {
  worker: Worker;
  shift1: number;
  shift2: number;
  total: number;
  presentDays: number;
}

export type AttendanceErrorCode =
  | 'INVALID_QR'
  | 'WORKER_NOT_FOUND'
  | 'WORKER_INACTIVE'
  | 'INVALID_SHIFT'
  | 'ALREADY_MARKED'
  | 'UNAUTHORIZED'
  | 'SERVER_ERROR';

export interface ApiError {
  code: AttendanceErrorCode | string;
  message: string;
}