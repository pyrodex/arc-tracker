import { CheckCircle2, Circle } from 'lucide-react';
import CountStepper from './CountStepper';
import type { Stencil, StencilTrackingMap } from '../types';
import StencilIcon from './StencilIcon';
import { StencilRarityBadge, stencilWeapons } from './StencilRarity';

interface Props {
  stencil: Stencil;
  trackingMap: StencilTrackingMap;
  onToggleLearned: (stencilId: number, learned: boolean) => void;
  onSetExtras: (stencilId: number, extras: number) => void;
}

/** Weapons listed before collapsing into "+N more". */
const WEAPONS_SHOWN = 4;

export default function StencilCard({ stencil, trackingMap, onToggleLearned, onSetExtras }: Props) {
  const tracking = trackingMap[stencil.id];
  const learned  = tracking?.learned === 1;
  const extras   = tracking?.extras ?? 0;
  const weapons  = stencilWeapons(stencil.weapons);

  return (
    <div className={`card p-3 flex items-start gap-3 transition-all group
      ${learned ? 'border-arc-learned/30 bg-arc-learned/5' : 'hover:border-arc-muted/40'}`}
    >
      <div className="shrink-0">
        <StencilIcon slug={stencil.slug} name={stencil.name} rarity={stencil.rarity} size={52} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={`text-sm font-medium leading-tight truncate ${learned ? 'text-arc-text' : 'text-arc-muted'}`}>
            {stencil.name}
          </p>
          <button
            onClick={() => onToggleLearned(stencil.id, !learned)}
            title={learned ? 'Mark as not learned' : 'Mark as learned'}
            className="shrink-0 transition-transform hover:scale-110"
          >
            {learned
              ? <CheckCircle2 className="w-5 h-5 text-arc-learned" />
              : <Circle className="w-5 h-5 text-arc-border group-hover:text-arc-muted" />
            }
          </button>
        </div>

        <div className="flex items-center gap-2 mt-1.5">
          <StencilRarityBadge rarity={stencil.rarity} />
        </div>

        {weapons.length > 0 && (
          <p className="text-xs text-arc-dim mt-1.5 leading-snug" title={weapons.join(', ')}>
            Fits {weapons.slice(0, WEAPONS_SHOWN).join(', ')}
            {weapons.length > WEAPONS_SHOWN && ` +${weapons.length - WEAPONS_SHOWN} more`}
          </p>
        )}

        {/* Extras row */}
        <div className="flex items-center gap-2 mt-2">
          <span className="text-[11px] text-arc-dim uppercase tracking-wide">Extras:</span>
          <CountStepper
            value={extras}
            onChange={n => onSetExtras(stencil.id, n)}
            name={`${stencil.name} extras`}
            size="xs"
            valueClassName={extras > 0 ? 'text-arc-extra bg-arc-extra/10 border-arc-extra/30' : 'text-arc-dim border-arc-border'}
          />
        </div>
      </div>
    </div>
  );
}
