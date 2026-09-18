import { corsHeaders, json } from '../_shared/cors.ts';
import { getUserFromRequest, serviceClient, todayInTimezone } from '../_shared/supabase.ts';

// A worker can only be marked once per shift per day. The uniqueness is enforced
// at the database level (unique constraint worker_id + shift_id + attendance_date).
// This function determines ALL server-side values (marked_by, marked_at,
// attendance_date) and never trusts anything computed on the client.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const { user } = await getUserFromRequest(req);
  if (!user) {
    return json(
      { success: false, code: 'UNAUTHORIZED', message: 'Not authenticated.' },
      401
    );
  }

  const admin = serviceClient();

  const { data: profile } = await admin
    .from('profiles')
    .select('id, role, active')
    .eq('id', user.id)
    .maybeSingle();

  const role = profile?.role;
  if (!profile || !profile.active || (role !== 'admin' && role !== 'supervisor')) {
    return json(
      { success: false, code: 'UNAUTHORIZED', message: 'You do not have permission to mark attendance.' },
      403
    );
  }

  let body: { worker_id?: string; shift_id?: string };
  try {
    body = await req.json();
  } catch {
    return json({ success: false, code: 'INVALID_REQUEST', message: 'Invalid request body.' }, 400);
  }

  const worker_id = body?.worker_id?.trim();
  const shift_id = body?.shift_id?.trim();
  if (!worker_id || !shift_id) {
    return json(
      { success: false, code: 'INVALID_REQUEST', message: 'worker_id and shift_id are required.' },
      400
    );
  }

  const attendanceDate = todayInTimezone(Deno.env.get('APP_TIMEZONE'));
  const markedAt = new Date().toISOString();

  const { data: worker, error: workerErr } = await admin
    .from('workers')
    .select('id, worker_id, name, active, department')
    .eq('worker_id', worker_id)
    .maybeSingle();

  if (workerErr || !worker) {
    return json(
      { success: false, code: 'WORKER_NOT_FOUND', message: 'Worker does not exist.' },
      404
    );
  }

  if (!worker.active) {
    return json(
      { success: false, code: 'WORKER_INACTIVE', message: 'This worker is currently inactive.' },
      400
    );
  }

  const { data: shift, error: shiftErr } = await admin
    .from('shifts')
    .select('id, name')
    .eq('id', shift_id)
    .eq('active', true)
    .maybeSingle();

  if (shiftErr || !shift) {
    return json(
      { success: false, code: 'INVALID_SHIFT', message: 'The selected shift is not available.' },
      400
    );
  }

  const { data: inserted, error: insertError } = await admin
    .from('attendance')
    .insert({
      worker_id: worker.id,
      shift_id: shift.id,
      attendance_date: attendanceDate,
      status: 'present',
      marked_by: user.id,
      method: 'qr',
      marked_at: markedAt,
    })
    .select('id, attendance_date, marked_at, worker:workers(worker_id, name), shift:shifts(name)')
    .single();

  if (insertError) {
    if (insertError.code === '23505') {
      return json(
        {
          success: false,
          code: 'ALREADY_MARKED',
          message: 'Attendance already marked for this worker for this shift today.',
        },
        409
      );
    }
    console.error('mark-attendance insert error', insertError);
    return json(
      { success: false, code: 'SERVER_ERROR', message: 'Could not save the attendance record.' },
      500
    );
  }

  return json({
    success: true,
    message: 'Attendance marked successfully',
    data: {
      worker_id: worker.worker_id,
      worker_name: worker.name,
      shift: shift.name,
      date: attendanceDate,
      marked_at: markedAt,
      record: inserted,
    },
  });
});