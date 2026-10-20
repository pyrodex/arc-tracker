import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { dismissToast, useToasts, type ToastTone } from '../hooks/toast';

const TONE: Record<ToastTone, { icon: typeof Info; className: string }> = {
  info:    { icon: Info,         className: 'text-arc-accent' },
  success: { icon: CheckCircle2, className: 'text-arc-learned' },
  error:   { icon: AlertCircle,  className: 'text-arc-danger' },
};

export default function Toaster() {
  const toasts = useToasts();
  if (!toasts.length) return null;

  return (
    <div
      className="fixed z-[60] bottom-4 left-1/2 -translate-x-1/2 sm:left-auto sm:right-4 sm:translate-x-0 w-[calc(100%-2rem)] max-w-sm space-y-2 pointer-events-none"
      role="region"
      aria-label="Notifications"
    >
      {toasts.map(t => {
        const { icon: Icon, className } = TONE[t.tone];
        return (
          <div
            key={t.id}
            role={t.tone === 'error' ? 'alert' : 'status'}
            className="pointer-events-auto card shadow-2xl flex items-center gap-3 pl-3 pr-2 py-2.5 animate-fade-in"
          >
            <Icon className={`w-4 h-4 shrink-0 ${className}`} />
            <p className="flex-1 min-w-0 text-sm text-arc-text">{t.message}</p>
            {t.action && (
              <button
                onClick={() => { t.action!.run(); dismissToast(t.id); }}
                className="shrink-0 px-2.5 py-1 rounded-md text-sm font-semibold text-arc-accent hover:bg-arc-accent/10"
              >
                {t.action.label}
              </button>
            )}
            <button onClick={() => dismissToast(t.id)} className="btn-ghost p-1 shrink-0" aria-label="Dismiss">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
