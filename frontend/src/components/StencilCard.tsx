import { useState } from 'react';
import { CheckCircle2, Circle, Plus, Minus } from 'lucide-react';
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
  const [editingExtras, setEditingExtras] = useState(false);
  const [extrasInput, setExtrasInput]     = useState('');

  const handleExtrasBlur = () => {
    const val = parseInt(extrasInput, 10);
    if (!isNaN(val) && val >= 0) onSetExtras(stencil.id, Math.min(val, 9999));
    setEditingExtras(false);
  };

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
          <p className="text-[11px] text-arc-dim mt-1.5 leading-snug" title={weapons.join(', ')}>
            Fits {weapons.slice(0, WEAPONS_SHOWN).join(', ')}
            {weapons.length > WEAPONS_SHOWN && ` +${weapons.length - WEAPONS_SHOWN} more`}
          </p>
        )}

        {/* Extras row */}
        <div className="flex items-center gap-2 mt-2">
          <span className="text-[11px] text-arc-dim uppercase tracking-wide">Extras:</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => extras > 0 && onSetExtras(stencil.id, extras - 1)}
              disabled={extras === 0}
              title="Decrease extras"
              className="w-5 h-5 rounded flex items-center justify-center text-arc-dim
                         hover:text-arc-muted hover:bg-arc-hover transition-colors disabled:opacity-30"
            >
              <Minus className="w-3 h-3" />
            </button>

            {editingExtras ? (
              <input
                className="w-10 bg-arc-panel border border-arc-border rounded px-1 py-0.5
                           text-xs text-center text-arc-text focus:outline-none focus:border-arc-accent/50"
                value={extrasInput}
                onChange={e => setExtrasInput(e.target.value)}
                onBlur={handleExtrasBlur}
                onKeyDown={e => (e.key === 'Enter' || e.key === 'Escape') && handleExtrasBlur()}
                autoFocus
                type="number"
                min={0}
                max={9999}
              />
            ) : (
              <button
                onClick={() => { setExtrasInput(String(extras)); setEditingExtras(true); }}
                className={`w-8 text-center text-xs font-mono font-medium rounded px-1 py-0.5 transition-colors
                  ${extras > 0
                    ? 'text-arc-extra bg-arc-extra/10 border border-arc-extra/30 hover:border-arc-extra/50'
                    : 'text-arc-dim hover:text-arc-muted'}`}
              >
                {extras}
              </button>
            )}

            <button
              onClick={() => onSetExtras(stencil.id, Math.min(extras + 1, 9999))}
              title="Increase extras"
              className="w-5 h-5 rounded flex items-center justify-center text-arc-dim
                         hover:text-arc-muted hover:bg-arc-hover transition-colors"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
