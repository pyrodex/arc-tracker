import CountStepper from './CountStepper';
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
    bg: '',
    badge: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
    glow: 'shadow-[0_0_12px_rgb(245_158_11/0.15)]',
    countColor: 'text-amber-400',
    countBg: 'bg-amber-500/10 border-amber-500/30',
    valueColor: 'text-amber-300',
  },
  epic: {
    label: 'Epic',
    border: 'border-purple-500/50',
    bg: '',
    badge: 'bg-purple-500/20 text-purple-400 border border-purple-500/30',
    glow: 'shadow-[0_0_12px_rgb(168_85_247/0.12)]',
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


  return (
    <div className={`card p-4 border ${config.border} ${count > 0 ? config.bg : ''} ${count > 0 ? config.glow : ''} transition-all duration-200`}>
      <div className="flex items-start gap-3">
        <ArcPartIcon slug={part.slug} name={part.name} rarity={part.rarity} size={44} />

        <div className="flex-1 min-w-0">
          <p className="font-medium text-arc-text text-sm leading-snug truncate">{part.name}</p>
          <p className="text-xs text-arc-dim mt-0.5">from {part.source}</p>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-sm ${config.badge}`}>
              {config.label}
            </span>
            {part.sell_value > 0 && (
              <span className="text-xs text-arc-dim">
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
          <CountStepper value={count} onChange={n => onSetCount(part.id, n)} name={part.name} valueClassName={`${config.countColor} ${config.countBg}`} />
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
