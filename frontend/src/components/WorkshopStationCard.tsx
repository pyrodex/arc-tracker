import { useEffect, useRef, useState } from 'react';
import { Check, type LucideIcon } from 'lucide-react';
import type { WorkshopCharacterCount, WorkshopRequirement, WorkshopStation } from '../types';
import ArcPartIcon from './ArcPartIcon';
import WorkshopMaterialIcon from './WorkshopMaterialIcon';

interface RequirementData {
  totalCount: number;
  breakdown: WorkshopCharacterCount[];
  activeCount: number;
}

interface WorkshopStationCardProps {
  station: WorkshopStation;
  icon: LucideIcon;
  currentLevel: number;
  getRequirementData: (req: WorkshopRequirement) => RequirementData;
  onSetLevel: (stationId: number, level: number) => void;
  onSetCount: (req: WorkshopRequirement, count: number) => void;
}

function InlineCounter({ value, onCommit }: { value: number; onCommit: (n: number) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) inputRef.current.select();
  }, [editing]);

  const commit = () => {
    const parsed = parseInt(draft, 10);
    if (!isNaN(parsed) && parsed >= 0 && parsed <= 9999) onCommit(parsed);
    setEditing(false);
  };

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => value > 0 && onCommit(value - 1)}
        disabled={value <= 0}
        className="w-6 h-6 rounded-md flex items-center justify-center text-arc-muted hover:text-arc-text hover:bg-arc-hover border border-arc-border disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-sm leading-none"
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
          onBlur={commit}
          onKeyDown={e => {
            if (e.key === 'Enter') commit();
            if (e.key === 'Escape') setEditing(false);
          }}
          className="w-12 text-center text-xs font-bold rounded-md border px-1 py-0.5 bg-arc-panel text-arc-accent border-arc-accent/30 outline-none focus:ring-1"
        />
      ) : (
        <button
          onClick={() => { setDraft(String(value)); setEditing(true); }}
          className="w-12 text-center text-xs font-bold rounded-md border px-1 py-1 text-arc-accent bg-arc-accent/10 border-arc-accent/30 hover:opacity-80 transition-colors"
          title="Click to edit"
        >
          {value}
        </button>
      )}

      <button
        onClick={() => value < 9999 && onCommit(value + 1)}
        disabled={value >= 9999}
        className="w-6 h-6 rounded-md flex items-center justify-center text-arc-muted hover:text-arc-text hover:bg-arc-hover border border-arc-border disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-sm leading-none"
        aria-label="Increase count"
      >+</button>
    </div>
  );
}

function RequirementRow({
  requirement,
  data,
  onSetCount,
}: {
  requirement: WorkshopRequirement;
  data: RequirementData;
  onSetCount: (count: number) => void;
}) {
  const met = data.totalCount >= requirement.qty_required;
  const sortedBreakdown = [...data.breakdown].sort((a, b) => b.count - a.count);

  return (
    <div className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-arc-hover/30 transition-colors">
      {requirement.item_type === 'arc_part' ? (
        <ArcPartIcon
          slug={requirement.slug}
          name={requirement.name}
          rarity={requirement.rarity ?? 'epic'}
          size={32}
        />
      ) : (
        <WorkshopMaterialIcon slug={requirement.slug} name={requirement.name} size={32} />
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-arc-text truncate">{requirement.name}</span>
          {requirement.item_type === 'arc_part' && (
            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-400 border border-purple-500/30 shrink-0">
              ARC Part
            </span>
          )}
        </div>

        {sortedBreakdown.length > 0 ? (
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {sortedBreakdown.map(cb => (
              <span
                key={cb.character_id}
                className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full border"
                style={{ backgroundColor: cb.character_color + '15', borderColor: cb.character_color + '40', color: cb.character_color }}
                title={`${cb.character_name} has ${cb.count}`}
              >
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: cb.character_color }} />
                {cb.character_name} ×{cb.count}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-[10px] text-arc-dim mt-1">Not currently held by anyone</p>
        )}
      </div>

      <div className="text-right shrink-0 w-20">
        <span className={`text-sm font-bold tabular-nums ${met ? 'text-arc-learned' : 'text-arc-muted'}`}>
          {data.totalCount}/{requirement.qty_required}
        </span>
        <p className="text-[10px] text-arc-dim mt-0.5 flex items-center justify-end gap-1">
          {met && <Check className="w-3 h-3 text-arc-learned" />} acquired
        </p>
      </div>

      <div className="shrink-0 border-l border-arc-border pl-3 ml-1">
        <InlineCounter value={data.activeCount} onCommit={onSetCount} />
      </div>
    </div>
  );
}

export default function WorkshopStationCard({
  station,
  icon: Icon,
  currentLevel,
  getRequirementData,
  onSetLevel,
  onSetCount,
}: WorkshopStationCardProps) {
  const maxLevel = station.levels.length > 0 ? Math.max(...station.levels.map(l => l.level)) : 3;
  const isMaxed = currentLevel >= maxLevel;

  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 px-4 py-3 border-b border-arc-border bg-arc-panel/40 flex-wrap">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${isMaxed ? 'bg-arc-learned/15 text-arc-learned' : 'bg-arc-accent/10 text-arc-accent'}`}>
            <Icon className="w-4.5 h-4.5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-arc-text">{station.name}</p>
            <p className="text-[11px] text-arc-dim">{isMaxed ? 'Max level reached' : `Level ${currentLevel} of ${maxLevel}`}</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <span className="text-[10px] text-arc-dim uppercase tracking-wide mr-1">Current Level</span>
          {Array.from({ length: maxLevel + 1 }, (_, level) => level).map(level => (
            <button
              key={level}
              onClick={() => onSetLevel(station.id, level)}
              className={`w-7 h-7 rounded-md text-xs font-bold border transition-colors
                ${currentLevel === level
                  ? 'bg-arc-accent/15 text-arc-accent border-arc-accent/40'
                  : 'text-arc-muted border-arc-border hover:text-arc-text hover:border-arc-muted/60'}`}
              title={`Set to level ${level}`}
            >
              {level}
            </button>
          ))}
        </div>
      </div>

      {/* Levels */}
      <div className="divide-y divide-arc-border/50">
        {station.levels.map(({ level, requirements }) => {
          const achieved = currentLevel >= level;
          const isNext = currentLevel + 1 === level;

          return (
            <div key={level} className={achieved ? 'bg-arc-learned/[0.03]' : ''}>
              <div className="flex items-center gap-2 px-4 pt-3 pb-1">
                <span className="text-xs font-semibold text-arc-text uppercase tracking-wide">Level {level}</span>
                {achieved && (
                  <span className="badge bg-arc-learned/15 text-arc-learned border border-arc-learned/30 text-[10px] gap-1">
                    <Check className="w-3 h-3" /> Built
                  </span>
                )}
                {!achieved && isNext && (
                  <span className="badge bg-arc-accent/15 text-arc-accent border border-arc-accent/30 text-[10px]">
                    Next
                  </span>
                )}
              </div>
              <div className="px-1 pb-2">
                {requirements.map(req => (
                  <RequirementRow
                    key={`${req.item_type}-${req.item_id}`}
                    requirement={req}
                    data={getRequirementData(req)}
                    onSetCount={(count) => onSetCount(req, count)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
