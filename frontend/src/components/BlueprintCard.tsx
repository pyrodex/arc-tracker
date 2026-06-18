import { useState } from 'react';
import { CheckCircle2, Circle, Plus, Minus } from 'lucide-react';
import type { Blueprint, TrackingMap } from '../types';
import BlueprintIcon from './BlueprintIcon';
import { CategoryBadge } from './CategoryIcon';

interface Props {
  blueprint: Blueprint;
  trackingMap: TrackingMap;
  onToggleLearned: (blueprintId: number, learned: boolean) => void;
  onSetExtras: (blueprintId: number, extras: number) => void;
}

export default function BlueprintCard({ blueprint, trackingMap, onToggleLearned, onSetExtras }: Props) {
  const tracking = trackingMap[blueprint.id];
  const learned  = tracking?.learned === 1;
  const extras   = tracking?.extras ?? 0;
  const [editingExtras, setEditingExtras] = useState(false);
  const [extrasInput, setExtrasInput]     = useState('');

  const handleExtrasBlur = () => {
    const val = parseInt(extrasInput, 10);
    if (!isNaN(val) && val >= 0) onSetExtras(blueprint.id, Math.min(val, 9999));
    setEditingExtras(false);
  };

  return (
    <div className={`card p-3 flex items-start gap-3 transition-all group
      ${learned ? 'border-arc-learned/30 bg-arc-learned/5' : 'hover:border-arc-muted/40'}`}
    >
      <div className="shrink-0 mt-0.5">
        <BlueprintIcon slug={blueprint.slug} name={blueprint.name} category={blueprint.category} size={36} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={`text-sm font-medium leading-tight truncate ${learned ? 'text-arc-text' : 'text-arc-muted'}`}>
            {blueprint.name}
          </p>
          <button
            onClick={() => onToggleLearned(blueprint.id, !learned)}
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
          <CategoryBadge category={blueprint.category} />
        </div>

        {/* Extras row */}
        <div className="flex items-center gap-2 mt-2">
          <span className="text-[11px] text-arc-dim uppercase tracking-wide">Extras:</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => extras > 0 && onSetExtras(blueprint.id, extras - 1)}
              disabled={extras === 0}
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
              onClick={() => onSetExtras(blueprint.id, Math.min(extras + 1, 9999))}
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
