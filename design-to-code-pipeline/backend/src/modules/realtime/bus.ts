let emit: (jobId: string) => void = () => undefined;

export function registerJobRealtime(emitter: (jobId: string) => void): void {
  emit = emitter;
}

export function notifyJob(jobId: string): void {
  try {
    emit(jobId);
  } catch {
    // avoid crashing pipeline on socket errors
  }
}
