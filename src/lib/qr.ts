export interface WorkerQrPayload {
  type: 'worker';
  workerId: string;
}

export function encodeWorkerQr(workerId: string): string {
  const payload: WorkerQrPayload = { type: 'worker', workerId };
  return JSON.stringify(payload);
}

export function decodeWorkerQr(raw: string): { workerId?: string } {
  const text =
    typeof raw === 'string' && raw.trim().startsWith('{')
      ? raw
      : (() => {
          try {
            return decodeURIComponent(raw);
          } catch {
            return '';
          }
        })();

  try {
    const parsed = JSON.parse(text) as WorkerQrPayload;
    if (parsed && parsed.type === 'worker' && typeof parsed.workerId === 'string') {
      return { workerId: parsed.workerId };
    }
    return {};
  } catch {
    return {};
  }
}