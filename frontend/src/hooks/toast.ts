import { useSyncExternalStore } from 'react';

export type ToastTone = 'info' | 'success' | 'error';

export interface Toast {
  id: number;
  message: string;
  tone: ToastTone;
  /** Optional button, e.g. "Undo". The toast closes after it runs. */
  action?: { label: string; run: () => void };
  /** Milliseconds before it closes on its own. */
  duration: number;
}

type Listener = () => void;

let toasts: Toast[] = [];
let nextId = 1;
const listeners = new Set<Listener>();
const timers = new Map<number, ReturnType<typeof setTimeout>>();

function emit() {
  for (const l of listeners) l();
}

export function dismissToast(id: number) {
  const t = timers.get(id);
  if (t) clearTimeout(t);
  timers.delete(id);
  toasts = toasts.filter(x => x.id !== id);
  emit();
}

/**
 * Shows a toast. Lives outside React so the query client's global error
 * handler can raise one too.
 */
export function toast(message: string, opts: Partial<Omit<Toast, 'id' | 'message'>> = {}): number {
  const id = nextId++;
  const t: Toast = {
    id,
    message,
    tone: opts.tone ?? 'info',
    action: opts.action,
    duration: opts.duration ?? (opts.action ? 8000 : opts.tone === 'error' ? 7000 : 4000),
  };
  // Keep the stack short; the newest matter most.
  toasts = [...toasts.slice(-3), t];
  timers.set(id, setTimeout(() => dismissToast(id), t.duration));
  emit();
  return id;
}

function subscribe(l: Listener) {
  listeners.add(l);
  return () => { listeners.delete(l); };
}

export function useToasts(): Toast[] {
  return useSyncExternalStore(subscribe, () => toasts, () => toasts);
}
