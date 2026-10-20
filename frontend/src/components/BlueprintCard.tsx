import { CheckCircle2, Circle } from 'lucide-react';
import CountStepper from './CountStepper';
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

  return (
    <div className={`card p-3 flex items-start gap-3 transition-all group
      ${learned ? 'border-arc-learned/30 bg-arc-learned/5' : 'hover:border-arc-muted/40'}`}
    >
      <div className="shrink-0">
        <BlueprintIcon slug={blueprint.slug} name={blueprint.name} category={blueprint.category} size={52} />
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
          <CountStepper
            value={extras}
            onChange={n => onSetExtras(blueprint.id, n)}
            name={`${blueprint.name} extras`}
            size="xs"
            valueClassName={extras > 0 ? 'text-arc-extra bg-arc-extra/10 border-arc-extra/30' : 'text-arc-dim border-arc-border'}
          />
        </div>
      </div>
    </div>
  );
}
