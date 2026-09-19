import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from 'npm:pdf-lib@1.17.1';
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

import { corsHeaders, json } from '../_shared/cors.ts';
import { getUserFromRequest, serviceClient } from '../_shared/supabase.ts';

const INK = rgb(0.06, 0.09, 0.16);
const MUTED = rgb(0.4, 0.45, 0.52);
const LINE = rgb(0.82, 0.86, 0.9);
const ACCENT = rgb(0.31, 0.27, 0.9);

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function monthLabel(month: string): string {
  const [, m] = month.split('-').map(Number);
  return `${MONTH_NAMES[m - 1]} ${month.slice(0, 4)}`;
}

function pad(num: number, len = 4): string {
  return String(num).padStart(len, '0');
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function formatRupees(value: number): string {
  return value.toLocaleString('en-IN');
}

function nextMonthStart(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 10);
}

interface SummaryRow {
  worker_id: string;
  name: string;
  shift1: number;
  shift2: number;
  fullDays: number;
  halfDays: number;
  absentDays: number;
  dailySalary: number | null;
  earned: number | null;
}

async function fetchAllAttendance(admin: SupabaseClient, month: string) {
  const rows: { worker_id: string; attendance_date: string; shift?: { shift_code?: string | null } | null }[] = [];
  const pageSize = 1000;
  const end = nextMonthStart(month);
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await admin
      .from('attendance')
      .select('worker_id, attendance_date, shift:shifts(shift_code)')
      .gte('attendance_date', `${month}-01`)
      .lt('attendance_date', end)
      .order('id', { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) throw error;
    rows.push(...(data as typeof rows));
    if (!data || data.length < pageSize) break;
  }
  return rows;
}

// ---------------------------------------------------------------------------
// PDF generation
// ---------------------------------------------------------------------------

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const M = 28;
const COL = { id: 46, name: 110, s1: 30, s2: 30, f: 30, h: 30, a: 32, d: 50, e: 56 };
const ROW_H = 17;
const MIN_Y = 40;

interface PageState {
  page: PDFPage;
  y: number;
}

async function buildPdf(opts: {
  companyName: string;
  companyAddress: string;
  monthLabel: string;
  totalWorkers: number;
  workingDays: number;
  shift1Total: number;
  shift2Total: number;
  totalAttendance: number;
  fullDaysTotal: number;
  halfDaysTotal: number;
  absentDaysTotal: number;
  totalPayroll: number;
  unconfigured: number;
  rows: SummaryRow[];
}): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const newPage = (): PageState => {
    const page = doc.addPage([PAGE_W, PAGE_H]);
    return { page, y: PAGE_H - M };
  };

  const drawHeader = (state: PageState) => {
    const { page } = state;
    page.drawText(opts.companyName || 'Gowri Toys', {
      x: M,
      y: PAGE_H - 72,
      size: 18,
      font: bold,
      color: INK,
    });
    if (opts.companyAddress) {
      page.drawText(opts.companyAddress, {
        x: M,
        y: PAGE_H - 86,
        size: 9,
        font,
        color: MUTED,
      });
    }
    page.drawText('MONTHLY ATTENDANCE & PAYROLL REPORT', {
      x: M,
      y: PAGE_H - 112,
      size: 13,
      font: bold,
      color: ACCENT,
    });
    page.drawText(opts.monthLabel, {
      x: M,
      y: PAGE_H - 128,
      size: 11,
      font,
      color: INK,
    });
    page.drawLine({
      start: { x: M, y: PAGE_H - 140 },
      end: { x: PAGE_W - M, y: PAGE_H - 140 },
      thickness: 1,
      color: LINE,
    });
  };

  const drawSummary = (state: PageState) => {
    const { page } = state;
    const lines: [string, string][] = [
      ['Total Workers', String(opts.totalWorkers)],
      ['Working Days', String(opts.workingDays)],
      ['Full Days', String(opts.fullDaysTotal)],
      ['Half Days', String(opts.halfDaysTotal)],
      ['Absent Days', String(opts.absentDaysTotal)],
      ['Shift 1 Attendance', String(opts.shift1Total)],
      ['Shift 2 Attendance', String(opts.shift2Total)],
      ['Total Attendance', String(opts.totalAttendance)],
      ['Total Payroll (₹)', `${formatRupees(opts.totalPayroll)}`],
    ];
    if (opts.unconfigured > 0) {
      lines.push(['Workers without salary', String(opts.unconfigured)]);
    }
    const valueX = PAGE_W - M - 120;
    let y = state.y - 18;
    for (const [label, value] of lines) {
      page.drawText(label, { x: M, y, size: 9, font, color: MUTED });
      page.drawText(value, { x: valueX, y, size: 10, font: bold, color: INK });
      y -= 21;
    }
    page.drawLine({
      start: { x: M, y: y + 6 },
      end: { x: PAGE_W - M, y: y + 6 },
      thickness: 1,
      color: LINE,
    });
    state.y = y;
  };

  const drawTableHeader = (state: PageState) => {
    const { page, y } = state;
    let x = M;
    const cells: [string, number][] = [
      ['ID', COL.id],
      ['Name', COL.name],
      ['S1', COL.s1],
      ['S2', COL.s2],
      ['Full', COL.f],
      ['Half', COL.h],
      ['Abs', COL.a],
      ['Daily', COL.d],
      ['Earned', COL.e],
    ];
    page.drawRectangle({
      x: M,
      y: y - 18,
      width: PAGE_W - M * 2,
      height: 22,
      color: rgb(0.93, 0.95, 0.98),
    });
    for (const [label, width] of cells) {
      page.drawText(label, {
        x: x + 4,
        y,
        size: 8.5,
        font: bold,
        color: INK,
      });
      x += width;
    }
    state.y = y - 40;
  };

  const drawRow = (state: PageState, row: SummaryRow) => {
    let x = M;
    const values = [
      row.worker_id,
      row.name,
      pad(row.shift1),
      pad(row.shift2),
      pad(row.fullDays),
      pad(row.halfDays),
      pad(row.absentDays),
      row.dailySalary != null ? formatRupees(row.dailySalary) : '—',
      row.earned != null ? formatRupees(row.earned) : '—',
    ];
    const widths = [COL.id, COL.name, COL.s1, COL.s2, COL.f, COL.h, COL.a, COL.d, COL.e];
    for (let i = 0; i < values.length; i++) {
      state.page.drawText(values[i], {
        x: x + 4,
        y: state.y,
        size: 8,
        font: i === 0 ? bold : font,
        color: i === 8 && row.earned != null ? ACCENT : INK,
      });
      x += widths[i];
    }
    state.page.drawLine({
      start: { x: M, y: state.y - 5 },
      end: { x: PAGE_W - M, y: state.y - 5 },
      thickness: 0.5,
      color: LINE,
    });
    state.y -= ROW_H;
  };

  let state = newPage();
  drawHeader(state);
  drawSummary(state);
  drawTableHeader(state);

  for (const row of opts.rows) {
    if (state.y - ROW_H < MIN_Y) {
      state = newPage();
      drawHeader(state);
      drawTableHeader(state);
      drawRow(state, row);
      continue;
    }
    drawRow(state, row);
  }

  const pages = doc.getPageCount();
  for (let i = 0; i < pages; i++) {
    doc.getPage(i).drawText(`Page ${i + 1} of ${pages}`, {
      x: PAGE_W - M - 60,
      y: M - 16,
      size: 8,
      font,
      color: MUTED,
    });
  }

  return doc.save();
}

// ---------------------------------------------------------------------------
// Function body
// ---------------------------------------------------------------------------

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const { user } = await getUserFromRequest(req);
  if (!user) {
    return json({ success: false, code: 'UNAUTHORIZED', message: 'Not authenticated.' }, 401);
  }

  const admin = serviceClient();

  const { data: profile } = await admin
    .from('profiles')
    .select('id, role, active')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile || !profile.active || (profile.role !== 'admin' && profile.role !== 'supervisor')) {
    return json(
      { success: false, code: 'UNAUTHORIZED', message: 'You do not have permission to generate reports.' },
      403
    );
  }

  let body: { month?: string };
  try {
    body = await req.json();
  } catch {
    return json({ success: false, code: 'INVALID_REQUEST', message: 'Invalid request body.' }, 400);
  }

  const month = body?.month;
  if (!month || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    return json(
      { success: false, code: 'INVALID_REQUEST', message: 'A valid month in YYYY-MM format is required.' },
      400
    );
  }

  try {
    const { data: settings } = await admin.from('company_settings').select('*').limit(1).maybeSingle();
    const { data: workers } = await admin
      .from('workers')
      .select('id, worker_id, name, daily_salary')
      .eq('active', true)
      .order('worker_id', { ascending: true });

    const attendance = await fetchAllAttendance(admin, month);

    const workingDaySet = new Set(attendance.map((r) => r.attendance_date));
    const workingDays = workingDaySet.size;

    const byWorker = new Map<
      string,
      { shift1: number; shift2: number; byDate: Map<string, Set<string>> }
    >();
    const ensure = (wid: string) => {
      let entry = byWorker.get(wid);
      if (!entry) {
        entry = { shift1: 0, shift2: 0, byDate: new Map<string, Set<string>>() };
        byWorker.set(wid, entry);
      }
      return entry;
    };

    let shift1Total = 0;
    let shift2Total = 0;
    for (const record of attendance) {
      const code = record.shift?.shift_code;
      const entry = ensure(record.worker_id);
      if (code === 'SHIFT_1') {
        shift1Total += 1;
        entry.shift1 += 1;
      } else if (code === 'SHIFT_2') {
        shift2Total += 1;
        entry.shift2 += 1;
      }
      if (code) {
        let codes = entry.byDate.get(record.attendance_date);
        if (!codes) {
          codes = new Set<string>();
          entry.byDate.set(record.attendance_date, codes);
        }
        codes.add(code);
      }
    }

    let fullDaysTotal = 0;
    let halfDaysTotal = 0;
    let totalPayroll = 0;
    let unconfigured = 0;

    const rows: SummaryRow[] = (workers ?? []).map((w) => {
      const entry = byWorker.get(w.id) ?? { shift1: 0, shift2: 0, byDate: new Map<string, Set<string>>() };
      let fullDays = 0;
      let halfDays = 0;
      for (const codes of entry.byDate.values()) {
        if (codes.has('SHIFT_1') && codes.has('SHIFT_2')) fullDays += 1;
        else if (codes.has('SHIFT_1') || codes.has('SHIFT_2')) halfDays += 1;
      }
      const absentDays = Math.max(workingDays - fullDays - halfDays, 0);
      const dailySalary = w.daily_salary ?? null;
      const earned =
        dailySalary == null
          ? null
          : round2(fullDays * dailySalary + halfDays * dailySalary * 0.5);
      fullDaysTotal += fullDays;
      halfDaysTotal += halfDays;
      if (earned != null) {
        totalPayroll += earned;
      } else if (fullDays + halfDays > 0) {
        unconfigured += 1;
      }
      return {
        worker_id: w.worker_id,
        name: w.name,
        shift1: entry.shift1,
        shift2: entry.shift2,
        fullDays,
        halfDays,
        absentDays,
        dailySalary,
        earned,
      };
    });

    totalPayroll = round2(totalPayroll);

    const label = monthLabel(month);
    const pdfBytes = await buildPdf({
      companyName: settings?.company_name ?? 'Gowri Toys',
      companyAddress: settings?.address ?? '',
      monthLabel: `${label}`,
      totalWorkers: (workers ?? []).length,
      workingDays,
      shift1Total,
      shift2Total,
      totalAttendance: shift1Total + shift2Total,
      fullDaysTotal,
      halfDaysTotal,
      absentDaysTotal: Math.max(workingDays * (workers ?? []).length - fullDaysTotal - halfDaysTotal, 0),
      totalPayroll,
      unconfigured,
      rows,
    });

    const absentDaysAll = Math.max(workingDays * (workers ?? []).length - fullDaysTotal - halfDaysTotal, 0);

    const salarySnapshot = {
      month: `${month}-01`,
      workingDays,
      totalPayroll,
      totalWorkers: rows.length,
      totalFullDays: fullDaysTotal,
      totalHalfDays: halfDaysTotal,
      totalAbsentDays: absentDaysAll,
      workers: rows.map((r) => ({
        worker_id: r.worker_id,
        name: r.name,
        daily_salary: r.dailySalary,
        shift1: r.shift1,
        shift2: r.shift2,
        fullDays: r.fullDays,
        halfDays: r.halfDays,
        absentDays: r.absentDays,
        earned: r.earned,
      })),
    };

    const [y, m] = month.split('-');
    const fileName = `Attendance_Payroll_Report_${label.replace(/ /g, '_')}.pdf`;
    const storagePath = `reports/${y}/${m}/${fileName}`;
    const bucket = Deno.env.get('REPORTS_BUCKET') ?? 'attendance-reports';

    const { error: uploadError } = await admin.storage
      .from(bucket)
      .upload(storagePath, new Uint8Array(pdfBytes), {
        contentType: 'application/pdf',
        upsert: true,
        cacheControl: '3600',
      });
    if (uploadError) {
      console.error('report upload error', uploadError);
      return json(
        {
          success: false,
          code: 'SERVER_ERROR',
          message: 'Could not store the report. Ensure the attendance-reports bucket exists.',
        },
        500
      );
    }

    const { data: report, error: reportError } = await admin
      .from('reports')
      .insert({
        report_type: 'monthly_attendance',
        report_month: `${month}-01`,
        file_name: fileName,
        storage_path: storagePath,
        generated_by: user.id,
        payroll_total: totalPayroll,
        salary_snapshot: salarySnapshot,
      })
      .select()
      .single();
    if (reportError) {
      console.error('report insert error', reportError);
      return json({ success: false, code: 'SERVER_ERROR', message: 'Could not register the report.' }, 500);
    }

    const { data: signed } = await admin.storage.from(bucket).createSignedUrl(storagePath, 3600);

    return json({
      success: true,
      message: 'Report generated successfully',
      report,
      url: signed?.signedUrl ?? null,
    });
  } catch (err) {
    console.error('generate-monthly-report error', err);
    return json({ success: false, code: 'SERVER_ERROR', message: 'Failed to generate the report.' }, 500);
  }
});