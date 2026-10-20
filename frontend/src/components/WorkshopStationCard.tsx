import { Check, type LucideIcon } from 'lucide-react';
import type { WorkshopRequirement, WorkshopStation } from '../types';
import type { RequirementData } from '../hooks/useWorkshopRequirements';
import ArcPartIcon from './ArcPartIcon';
import WorkshopMaterialIcon from './WorkshopMaterialIcon';
import CountStepper from './CountStepper';


interface WorkshopStationCardProps {
  station: WorkshopStation;
  icon: LucideIcon;
  currentLevel: number;
  getRequirementData: (req: WorkshopRequirement) => RequirementData;
  onSetLevel: (stationId: number, level: number) => void;
  onSetCount: (req: WorkshopRequirement, count: number) => void;
}

function RequirementRow({
  requirement,
  data,
  achieved,
  onSetCount,
}: {
  requirement: WorkshopRequirement;
  data: RequirementData;
  /** The level is already built, so these materials were spent, not owed. */
  achieved: boolean;
  onSetCount: (count: number) => void;
}) {
  // Upgrades are built per character, so the headline is this character's own
  // count; the all-characters total shows what could be pooled.
  const met = data.activeCount >= requirement.qty_required;
  const pooledMet = !met && data.totalCount >= requirement.qty_required;
  const sortedBreakdown = [...data.breakdown].sort((a, b) => b.count - a.count);

  return (
    <div className="flex flex-wrap sm:flex-nowrap items-center gap-x-3 gap-y-2 py-2.5 px-3 rounded-lg hover:bg-arc-hover/30 transition-colors">
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

      <div className="flex-1 min-w-[10rem]">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-arc-text">{requirement.name}</span>
          {requirement.item_type === 'arc_part' && (
            <span className="text-xs font-semibold px-1.5 py-0.5 rounded-sm bg-purple-500/15 text-purple-400 border border-purple-500/30 shrink-0">
              ARC Part
            </span>
          )}
        </div>

        {sortedBreakdown.length > 0 ? (
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {sortedBreakdown.map(cb => (
              <span
                key={cb.character_id}
                className="inline-flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded-full border"
                style={{ backgroundColor: cb.character_color + '15', borderColor: cb.character_color + '40', color: cb.character_color }}
                title={`${cb.character_name} has ${cb.count}`}
              >
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: cb.character_color }} />
                {cb.character_name} ×{cb.count}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-xs text-arc-dim mt-1">Not currently held by anyone</p>
        )}
      </div>

      {/* On phones the counts and stepper drop to their own line, right-aligned. */}
      <div className="flex items-center gap-3 ml-auto">
      <div className="text-right shrink-0 w-24">
        <span
          className={`text-sm font-bold tabular-nums inline-flex items-center gap-1 ${achieved ? 'text-arc-muted' : met ? 'text-arc-learned' : 'text-arc-text'}`}
          title="This character's count / required"
        >
          {met && !achieved && <Check className="w-3.5 h-3.5" />}
          {data.activeCount}/{requirement.qty_required}
        </span>
        <p className={`text-xs mt-0.5 tabular-nums ${pooledMet && !achieved ? 'text-arc-extra' : 'text-arc-dim'}`}
          title="Held across all characters">
          {achieved
            ? 'already built'
            : met
            ? 'have enough'
            : pooledMet
              ? `${data.totalCount} across all`
              : `need ${requirement.qty_required - data.activeCount} more`}
        </p>
      </div>

      <div className="shrink-0 border-l border-arc-border pl-3 ml-1">
        <CountStepper value={data.activeCount} onChange={onSetCount} name={requirement.name} size="sm" />
      </div>
      </div>
    </div>
  );
}

export interface LevelStatus {
  /** Requirements this character is still short of, with how many more. */
  missing: { name: string; short: number }[];
  /** True when every requirement is met by pooling all characters' counts. */
  pooled: boolean;
}

/** What stands between this character and building a level. */
export function levelStatus(
  requirements: WorkshopRequirement[],
  getRequirementData: (req: WorkshopRequirement) => RequirementData,
): LevelStatus {
  const missing: LevelStatus['missing'] = [];
  let pooled = true;
  for (const req of requirements) {
    const d = getRequirementData(req);
    if (d.activeCount < req.qty_required) missing.push({ name: req.name, short: req.qty_required - d.activeCount });
    if (d.totalCount < req.qty_required) pooled = false;
  }
  return { missing, pooled };
}

function ReadinessBadge({ status }: { status: LevelStatus }) {
  if (status.missing.length === 0) {
    return (
      <span className="badge bg-arc-learned/15 text-arc-learned border border-arc-learned/30 text-xs gap-1">
        <Check className="w-3 h-3" /> Ready to build
      </span>
    );
  }
  const detail = status.missing.map(m => `${m.short}× ${m.name}`).join(', ');
  if (status.pooled) {
    return (
      <span className="badge bg-arc-extra/15 text-arc-extra border border-arc-extra/30 text-xs"
        title={`Your characters hold enough between them. This character is short: ${detail}`}>
        Ready if pooled
      </span>
    );
  }
  return (
    <span className="badge bg-arc-border/50 text-arc-muted border border-arc-border text-xs" title={`Short: ${detail}`}>
      Short {status.missing.length} item{status.missing.length === 1 ? '' : 's'}
    </span>
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
            <Icon className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-semibold text-arc-text">{station.name}</p>
            <p className="text-xs text-arc-dim">{isMaxed ? 'Max level reached' : `Level ${currentLevel} of ${maxLevel}`}</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <span className="text-[11px] text-arc-dim uppercase tracking-wide mr-1">Current Level</span>
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
        {station.levels.map(({ level, note, requirements }) => {
          const achieved = currentLevel >= level;
          const isNext = currentLevel + 1 === level;
          const status = achieved ? null : levelStatus(requirements, getRequirementData);

          return (
            <div key={level} className={achieved ? 'bg-arc-learned/3' : ''}>
              <div className="flex items-center gap-2 px-4 pt-3 pb-1">
                <span className="text-xs font-semibold text-arc-text uppercase tracking-wide">Level {level}</span>
                {achieved && (
                  <span className="badge bg-arc-learned/15 text-arc-learned border border-arc-learned/30 text-xs gap-1">
                    <Check className="w-3 h-3" /> Built
                  </span>
                )}
                {!achieved && isNext && (
                  <span className="badge bg-arc-accent/15 text-arc-accent border border-arc-accent/30 text-xs">
                    Next
                  </span>
                )}
                {status && <ReadinessBadge status={status} />}
                {note && (
                  <span className="text-xs text-arc-dim ml-auto">{note}</span>
                )}
              </div>
              <div className="px-1 pb-2">
                {requirements.map(req => (
                  <RequirementRow
                    key={`${req.item_type}-${req.item_id}`}
                    requirement={req}
                    data={getRequirementData(req)}
                    achieved={achieved}
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
