import { useEffect, useRef, useState } from 'react';

interface Props {
  value: number;
  onChange: (n: number) => void;
  /** Item name for screen readers, e.g. "Rusted Gear". */
  name: string;
  min?: number;
  max?: number;
  size?: 'xs' | 'sm' | 'md';
  /** Colours for the number chip (text, border, background). */
  valueClassName?: string;
}

const HOLD_DELAY = 380;

/**
 * − [n] + with click-to-type. Holding − or + repeats, speeding up the longer
 * it's held, and saves once on release instead of once per step.
 *
 * The stepper keeps its own pending value until the server catches up, so
 * quick clicks add up (3 clicks = +3) rather than each one re-sending
 * "current + 1" from a value that hasn't refreshed yet.
 */
export default function CountStepper({
  value, onChange, name, min = 0, max = 9999, size = 'md',
  valueClassName = 'text-arc-accent bg-arc-accent/10 border-arc-accent/30',
}: Props) {
  const [pending, setPending] = useState<number | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const pendingRef = useRef<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holding = useRef(false);
  const steps = useRef(0);

  const shown = pending ?? value;

  const settle = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearPending = () => { setPending(null); pendingRef.current = null; };

  // Drop the local value once the server shows it. An intermediate refresh
  // (from an earlier click) leaves it alone, so rapid clicks never step back.
  useEffect(() => {
    if (!holding.current && pendingRef.current === value) clearPending();
  }, [value]);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
    if (settle.current) clearTimeout(settle.current);
  }, []);

  const clamp = (n: number) => Math.min(max, Math.max(min, n));

  const setLocal = (n: number) => {
    pendingRef.current = n;
    setPending(n);
  };

  const commit = (n: number) => {
    if (n === value) { clearPending(); return; }
    setLocal(n);
    onChange(n);
    // If the save fails the server value never arrives; fall back to it
    // rather than showing a number that wasn't stored.
    if (settle.current) clearTimeout(settle.current);
    settle.current = setTimeout(clearPending, 5000);
  };

  const stop = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    if (!holding.current) return;
    holding.current = false;
    const n = pendingRef.current;
    if (n !== null) commit(n);
  };

  const start = (dir: 1 | -1) => {
    holding.current = true;
    steps.current = 0;
    setLocal(clamp((pendingRef.current ?? value) + dir));
    const tick = () => {
      steps.current += 1;
      setLocal(clamp((pendingRef.current ?? value) + dir));
      // 120ms → 40ms as the hold goes on.
      timer.current = setTimeout(tick, Math.max(40, 120 - steps.current * 8));
    };
    timer.current = setTimeout(tick, HOLD_DELAY);
  };

  const btn = size === 'xs' ? 'w-6 h-6 text-sm' : size === 'sm' ? 'w-6 h-6 text-sm' : 'w-7 h-7 text-base';
  const chip = size === 'xs' ? 'w-10 text-xs' : size === 'sm' ? 'w-12' : 'w-14 text-sm';

  const stepButton = (dir: 1 | -1) => {
    const disabled = dir < 0 ? shown <= min : shown >= max;
    return (
      <button
        type="button"
        disabled={disabled}
        onPointerDown={e => {
          if (e.button !== 0 || disabled) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          start(dir);
        }}
        onPointerUp={stop}
        onPointerCancel={stop}
        onLostPointerCapture={stop}
        // Keyboard activation (Enter/Space) arrives as a click with detail 0;
        // pointer clicks are already handled above.
        onClick={e => { if (e.detail === 0) commit(clamp(shown + dir)); }}
        onContextMenu={e => e.preventDefault()}
        className={`${btn} rounded-md flex items-center justify-center text-arc-muted hover:text-arc-text hover:bg-arc-hover border border-arc-border disabled:opacity-30 disabled:cursor-not-allowed transition-colors leading-none select-none touch-manipulation`}
        aria-label={`${dir < 0 ? 'Decrease' : 'Increase'} ${name}`}
        title={`${dir < 0 ? 'Decrease' : 'Increase'} — hold to repeat`}
      >{dir < 0 ? '−' : '+'}</button>
    );
  };

  const commitDraft = () => {
    const n = parseInt(draft, 10);
    if (Number.isFinite(n) && n >= min && n <= max) commit(n);
    setEditing(false);
  };

  return (
    <div className="flex items-center gap-1">
      {stepButton(-1)}
      {editing ? (
        <input
          ref={inputRef}
          inputMode="numeric"
          value={draft}
          onChange={e => setDraft(e.target.value.replace(/[^0-9]/g, ''))}
          onBlur={commitDraft}
          onKeyDown={e => {
            if (e.key === 'Enter') commitDraft();
            if (e.key === 'Escape') setEditing(false);
          }}
          aria-label={`${name} count`}
          className={`${chip} text-center font-bold rounded-md border px-1 py-0.5 bg-arc-panel outline-hidden focus:ring-1 tabular-nums ${valueClassName}`}
        />
      ) : (
        <button
          type="button"
          onClick={() => { setDraft(String(shown)); setEditing(true); }}
          className={`${chip} text-center font-bold rounded-md border px-1 py-1 transition-colors hover:opacity-80 tabular-nums ${valueClassName}`}
          title="Click to type a number"
          aria-label={`${name}: ${shown}. Click to edit`}
        >
          {shown}
        </button>
      )}
      {stepButton(1)}
    </div>
  );
}
