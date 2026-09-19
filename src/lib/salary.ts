import type { Worker } from '@/lib/types';

/**
 * Centralized salary/payroll rules.
 *
 * Daily rule:
 *   0 unique shifts  -> 0%
 *   1 unique shift   -> 50% of daily_salary
 *   2 unique shifts  -> 100% of daily_salary
 *
 * Attendance is ALWAYS deduplicated by unique shift per worker per day, so
 * duplicate records can never inflate the pay above 100%.
 *
 * A salary of `null` means it has not been configured yet. Functions therefore
 * return `null` (not ₹0) so the UI can show "Salary not configured" instead of
 * inventing a payout.
 */

/** Minimal shape we read from attendance rows across every screen. */
export interface AttendanceLike {
  worker_id: string;
  attendance_date: string;
  shift?: { shift_code?: string | null } | null;
}

const round2 = (value: number) => Math.round(value * 100) / 100;

/** Formats a rupee amount. Returns '—' for null/undefined. */
export function formatRupees(value: number | null | undefined): string {
  if (value == null) return '—';
  return `₹${value.toLocaleString('en-IN')}`;
}

/** Parses a user typed daily-salary into a number, or null when empty. */
export function parseSalaryInput(text: string): number | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const value = Number(trimmed);
  if (Number.isNaN(value) || value < 0) return null;
  return round2(value);
}

/** True when the typed value is non-empty but not a valid salary. */
export function isInvalidSalaryInput(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  const value = Number(trimmed);
  return Number.isNaN(value) || value < 0;
}

/** Unique shift codes attended by a worker across the given rows. */
export function uniqueShiftCount(records: AttendanceLike[]): number {
  const codes = new Set<string>();
  for (const r of records) {
    const code = r.shift?.shift_code;
    if (code) codes.add(code);
  }
  return codes.size;
}

/** Earned amount for a single day given the daily rate and unique shift count. */
export function earnedForShiftCount(
  dailySalary: number | null | undefined,
  shiftCount: number
): number | null {
  if (dailySalary == null) return null;
  if (shiftCount <= 0) return 0;
  if (shiftCount >= 2) return round2(dailySalary);
  return round2(dailySalary * 0.5);
}

function roundTo2(value: number): number {
  return Math.round(value * 100) / 100;
}

interface WorkerDayTally {
  shift1: number;
  shift2: number;
  fullDays: number;
  halfDays: number;
}

/** Groups rows per worker, then tallies shifts + full/half days from unique
 * shift codes per day. Full = both shifts present; half = exactly one. */
function tallyWorkerDays(rows: AttendanceLike[]): WorkerDayTally {
  const byDate = new Map<string, Set<string>>();

  for (const r of rows) {
    const code = r.shift?.shift_code;
    if (!code) continue;
    let codes = byDate.get(r.attendance_date);
    if (!codes) {
      codes = new Set<string>();
      byDate.set(r.attendance_date, codes);
    }
    codes.add(code);
  }

  let shift1 = 0;
  let shift2 = 0;
  let fullDays = 0;
  let halfDays = 0;

  for (const codes of byDate.values()) {
    const s1 = codes.has('SHIFT_1');
    const s2 = codes.has('SHIFT_2');
    if (s1) shift1 += 1;
    if (s2) shift2 += 1;
    if (s1 && s2) fullDays += 1;
    else if (s1 || s2) halfDays += 1;
  }

  return { shift1, shift2, fullDays, halfDays };
}

/* -------------------------------------------------------------------------- *
 * Daily payroll
 * -------------------------------------------------------------------------- */

export interface DayPayrollSummary {
  /** Active workers used as the denominator. */
  totalWorkers: number;
  present: number;
  fullDay: number;
  halfDay: number;
  absent: number;
  /** Sum of earned amounts for present workers that have a salary configured. */
  totalPayroll: number;
  /** Present workers without a configured salary (excluded from totalPayroll). */
  unconfiguredPresent: number;
  configuredPresent: number;
}

export function summarizeDayPayroll(
  workers: Worker[],
  records: (AttendanceLike & { worker?: { daily_salary?: number | null } | null })[]
): DayPayrollSummary {
  const activeById = new Map(workers.map((w) => [w.id, w]));

  const byWorker = new Map<string, { salary: number | null; shifts: Set<string> }>();

  for (const r of records) {
    let entry = byWorker.get(r.worker_id);
    if (!entry) {
      const listed = activeById.get(r.worker_id);
      const salary = listed
        ? (listed.daily_salary ?? null)
        : (r.worker?.daily_salary ?? null);
      entry = { salary, shifts: new Set<string>() };
      byWorker.set(r.worker_id, entry);
    }
    const code = r.shift?.shift_code;
    if (code) entry.shifts.add(code);
  }

  let fullDay = 0;
  let halfDay = 0;
  let totalPayroll = 0;
  let unconfiguredPresent = 0;
  let configuredPresent = 0;

  for (const entry of byWorker.values()) {
    const count = entry.shifts.size;
    if (count >= 2) fullDay += 1;
    else if (count === 1) halfDay += 1;

    if (entry.salary == null) {
      unconfiguredPresent += 1;
    } else {
      configuredPresent += 1;
      const earned = earnedForShiftCount(entry.salary, count);
      totalPayroll += earned ?? 0;
    }
  }

  const present = byWorker.size;

  return {
    totalWorkers: workers.length,
    present,
    fullDay,
    halfDay,
    absent: Math.max(workers.length - present, 0),
    totalPayroll: round2(totalPayroll),
    unconfiguredPresent,
    configuredPresent,
  };
}

/* -------------------------------------------------------------------------- *
 * Monthly payroll
 * -------------------------------------------------------------------------- */

export interface WorkerPayroll {
  worker: Worker;
  shift1: number;
  shift2: number;
  fullDays: number;
  halfDays: number;
  absentDays: number;
  dailySalary: number | null;
  /** null when the worker has no salary configured. */
  earned: number | null;
}

export interface MonthlyPayrollSummary {
  month: string;
  /** Days on which any worker attended (the working days used for absent count). */
  workingDays: number;
  totalWorkers: number;
  totalFullDays: number;
  totalHalfDays: number;
  totalAbsentDays: number;
  totalPayroll: number;
  /** Workers with no salary configured (excluded from totalPayroll). */
  unconfigured: number;
  workers: WorkerPayroll[];
}

export function getWorkerMonthlyPayroll(
  worker: Worker,
  allRows: AttendanceLike[]
): {
  shift1: number;
  shift2: number;
  fullDays: number;
  halfDays: number;
  absentDays: number;
  workingDays: number;
  dailySalary: number | null;
  earned: number | null;
} {
  const workingDays = new Set(allRows.map((r) => r.attendance_date)).size;
  const own = allRows.filter((r) => r.worker_id === worker.id);
  const tally = tallyWorkerDays(own);
  const covered = tally.fullDays + tally.halfDays;
  const absentDays = Math.max(workingDays - covered, 0);
  const dailySalary = worker.daily_salary ?? null;
  const earned =
    dailySalary == null
      ? null
      : roundTo2(tally.fullDays * dailySalary + tally.halfDays * dailySalary * 0.5);

  return {
    ...tally,
    absentDays,
    workingDays,
    dailySalary,
    earned,
  };
}

export function getMonthlyPayrollSummary(
  month: string,
  workers: Worker[],
  rows: AttendanceLike[]
): MonthlyPayrollSummary {
  const presentInMonth = new Set(rows.map((r) => r.worker_id));
  // Include inactive workers only when they have attendance so historical
  // payroll stays intact without listing every long-gone worker.
  const relevant = workers.filter((w) => w.active || presentInMonth.has(w.id));
  const workingDays = new Set(rows.map((r) => r.attendance_date)).size;

  const byWorker = new Map<string, WorkerDayTally>();
  for (const worker of relevant) {
    const own = rows.filter((r) => r.worker_id === worker.id);
    byWorker.set(worker.id, tallyWorkerDays(own));
  }

  const items: WorkerPayroll[] = relevant.map((worker) => {
    const tally = byWorker.get(worker.id) ?? {
      shift1: 0,
      shift2: 0,
      fullDays: 0,
      halfDays: 0,
    };
    const covered = tally.fullDays + tally.halfDays;
    const absentDays = Math.max(workingDays - covered, 0);
    const dailySalary = worker.daily_salary ?? null;
    const earned =
      dailySalary == null
        ? null
        : roundTo2(tally.fullDays * dailySalary + tally.halfDays * dailySalary * 0.5);

    return {
      worker,
      shift1: tally.shift1,
      shift2: tally.shift2,
      fullDays: tally.fullDays,
      halfDays: tally.halfDays,
      absentDays,
      dailySalary,
      earned,
    };
  });

  return {
    month,
    workingDays,
    totalWorkers: items.length,
    totalFullDays: items.reduce((sum, it) => sum + it.fullDays, 0),
    totalHalfDays: items.reduce((sum, it) => sum + it.halfDays, 0),
    totalAbsentDays: items.reduce((sum, it) => sum + it.absentDays, 0),
    totalPayroll: roundTo2(items.reduce((sum, it) => sum + (it.earned ?? 0), 0)),
    unconfigured: items.filter((it) => it.dailySalary == null).length,
    workers: items,
  };
}