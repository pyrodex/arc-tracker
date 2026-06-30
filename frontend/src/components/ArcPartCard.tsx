import { useState, useRef, useEffect } from 'react';
import type { ArcPart, ArcPartTrackingMap } from '../types';
import ArcPartIcon from './ArcPartIcon';

interface ArcPartCardProps {
  part: ArcPart;
  trackingMap: ArcPartTrackingMap;
  onSetCount: (partId: number, count: number) => void;
}

const rarityConfig = {
  legendary: {
    label: 'Legendary',
    border: 'border-amber-500/50',
    bg: 'bg-amber-500/8',
    badge: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
    glow: 'shadow-[0_0_12px_rgb(245_158_11_/_0.15)]',
    countColor: 'text-amber-400',
    countBg: 'bg-amber-500/10 border-amber-500/30',
    valueColor: 'text-amber-300',
  },
  epic: {
    label: 'Epic',
    border: 'border-purple-500/50',
    bg: 'bg-purple-500/8',
    badge: 'bg-purple-500/20 text-purple-400 border border-purple-500/30',
    glow: 'shadow-[0_0_12px_rgb(168_85_247_/_0.12)]',
    countColor: 'text-purple-400',
    countBg: 'bg-purple-500/10 border-purple-500/30',
    valueColor: 'text-purple-300',
  },
} as const;

function formatValue(n: number) {
  return n.toLocaleString();
}

export default function ArcPartCard({ part, trackingMap, onSetCount }: ArcPartCardProps) {
  const record = trackingMap[part.id];
  const count  = record?.count ?? 0;
  const config = rarityConfig[part.rarity];
  const totalValue = count * part.sell_value;

  const [editing, setEditing] = useState(false);
  const [draft, setDraft]     = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) inputRef.current.select();
  }, [editing]);

  const decrement = () => { if (count > 0)    onSetCount(part.id, count - 1); };
  const increment = () => { if (count < 9999) onSetCount(part.id, count + 1); };

  const commitEdit = () => {
    const parsed = parseInt(draft, 10);
    if (!isNaN(parsed) && parsed >= 0 && parsed <= 9999) onSetCount(part.id, parsed);
    setEditing(false);
  };

  return (
    <div className={`card p-4 border ${config.border} ${count > 0 ? config.bg : ''} ${count > 0 ? config.glow : ''} transition-all duration-200`}>
      <div className="flex items-start gap-3">
        <ArcPartIcon slug={part.slug} name={part.name} rarity={part.rarity} size={44} />

        <div className="flex-1 min-w-0">
          <p className="font-medium text-arc-text text-sm leading-snug truncate">{part.name}</p>
          <p className="text-xs text-arc-dim mt-0.5">from {part.source}</p>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${config.badge}`}>
              {config.label}
            </span>
            {part.sell_value > 0 && (
              <span className="text-[10px] text-arc-dim">
                {formatValue(part.sell_value)} ea
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Count + value */}
      <div className="mt-3 pt-3 border-t border-arc-border space-y-2">
        {/* Counter row */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-arc-dim">Collected</span>
          <div className="flex items-center gap-1">
            <button
              onClick={decrement}
              disabled={count <= 0}
              className="w-7 h-7 rounded-md flex items-center justify-center text-arc-muted hover:text-arc-text hover:bg-arc-hover border border-arc-border disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-base leading-none"
              aria-label="Decrease count"
            >−</button>

            {editing ? (
              <input
                ref={inputRef}
                type="number"
                min={0}
                max={9999}
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onBlur={commitEdit}
                onKeyDown={e => {
                  if (e.key === 'Enter') commitEdit();
                  if (e.key === 'Escape') setEditing(false);
                }}
                className={`w-14 text-center text-sm font-bold rounded-md border px-1 py-0.5 bg-arc-panel outline-none focus:ring-1 ${config.countColor} ${config.countBg}`}
              />
            ) : (
              <button
                onClick={() => { setDraft(String(count)); setEditing(true); }}
                className={`w-14 text-center text-sm font-bold rounded-md border px-1 py-1 transition-colors ${config.countColor} ${config.countBg} hover:opacity-80`}
                title="Click to edit"
              >
                {count}
              </button>
            )}

            <button
              onClick={increment}
              disabled={count >= 9999}
              className="w-7 h-7 rounded-md flex items-center justify-center text-arc-muted hover:text-arc-text hover:bg-arc-hover border border-arc-border disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-base leading-none"
              aria-label="Increase count"
            >+</button>
          </div>
        </div>

        {/* Total value row — only shown when count > 0 */}
        {count > 0 && part.sell_value > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-arc-dim">Value</span>
            <span className={`text-xs font-semibold tabular-nums ${config.valueColor}`}>
              {formatValue(totalValue)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
