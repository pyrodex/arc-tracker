import { Clock } from 'lucide-react';

/**
 * Renders a tracked area's last-updated stamp as "24 Sep 2026 (2 days ago)".
 *
 * The API sends explicit UTC (…Z). Passing a bare 'YYYY-MM-DD HH:MM:SS' here
 * would be parsed as local time and silently shift by the viewer's offset, so
 * anything without a zone is treated as UTC rather than trusted to Date.
 */

function parseUtc(value: string): Date {
  // Already zoned (Z or ±HH:MM) — hand it to Date as-is.
  if (/(Z|[+-]\d{2}:?\d{2})$/.test(value)) return new Date(value);
  return new Date(`${value.replace(' ', 'T')}Z`);
}

export function formatRelative(from: Date, now: Date = new Date()): string {
  const seconds = Math.round((now.getTime() - from.getTime()) / 1000);
  // A clock skew of a few seconds shouldn't read as "in 3 seconds".
  if (seconds < 45) return 'just now';

  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ['year', 31_536_000],
    ['month', 2_592_000],
    ['week', 604_800],
    ['day', 86_400],
    ['hour', 3_600],
    ['minute', 60],
  ];
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });

  for (const [unit, secondsPer] of units) {
    if (Math.abs(seconds) >= secondsPer) {
      return rtf.format(-Math.round(seconds / secondsPer), unit);
    }
  }
  return 'just now';
}

export function formatAbsolute(date: Date): string {
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

interface Props {
  /** UTC timestamp from the API, or null when the area has never been touched. */
  value: string | null;
  /** Prefix such as "Blueprints" — omitted on pages where the area is obvious. */
  label?: string;
  className?: string;
  showIcon?: boolean;
  /**
   * Puts the relative part on its own line. In a narrow column the inline form
   * wraps only for the longer dates, which leaves a grid looking ragged;
   * stacking makes every cell the same shape regardless of string length.
   */
  stacked?: boolean;
}

export default function LastUpdated({
  value, label, className = '', showIcon = true, stacked = false,
}: Props) {
  if (!value) {
    return (
      <span className={`text-xs text-arc-dim ${className}`}>
        {label && <span className="text-arc-dim">{label} </span>}
        never updated
      </span>
    );
  }

  const date = parseUtc(value);
  if (Number.isNaN(date.getTime())) return null;

  const absolute = formatAbsolute(date);
  const relative = formatRelative(date);

  if (stacked) {
    return (
      <span className={`block text-xs text-arc-muted ${className}`} title={date.toLocaleString()}>
        <span className="block tabular-nums whitespace-nowrap">{absolute}</span>
        <span className="block text-arc-dim whitespace-nowrap">{relative}</span>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs text-arc-muted ${className}`}
      title={date.toLocaleString()}
    >
      {showIcon && <Clock className="w-3 h-3 text-arc-dim shrink-0" />}
      {label && <span className="text-arc-dim">{label}</span>}
      <span className="tabular-nums whitespace-nowrap">{absolute}</span>
      <span className="text-arc-dim whitespace-nowrap">({relative})</span>
    </span>
  );
}
