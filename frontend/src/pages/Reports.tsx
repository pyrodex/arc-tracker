import { useState } from 'react';
import type { ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BarChart3, AlertCircle, Package, Cpu, Wrench, ChevronDown, ChevronRight, Users, Crosshair, SprayCan, BookOpen } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useUnlearnedReport, useExtrasReport, useArcPartsReport, useWorkshopMaterialsReport, useCharacters, useGunConfigsReport, useStencilUnlearnedReport, useStencilExtrasReport } from '../hooks/useApi';
import type { UnlearnedBlueprint, ExtrasReport, ArcPartsReport, WorkshopMaterialsReport, CharacterLearnStatus, CharacterExtras, Character, UnlearnedStencil, StencilExtrasReport } from '../types';
import { CategoryBadge } from '../components/CategoryIcon';
import BlueprintIcon from '../components/BlueprintIcon';
import ArcPartIcon from '../components/ArcPartIcon';
import StencilIcon from '../components/StencilIcon';
import { StencilRarityBadge } from '../components/StencilRarity';
import WorkshopMaterialIcon from '../components/WorkshopMaterialIcon';

type ReportId = 'blueprints' | 'stencils' | 'arc-parts' | 'workshop' | 'loadouts';
type ReportView = 'unlearned' | 'extras';

interface ReportDef {
  id: ReportId;
  label: string;
  icon: LucideIcon;
  /** One line shown under the tabs, per view where the report has two. */
  description: string | Record<ReportView, string>;
  /** Blueprints and stencils have both an Unlearned and an Extras view. */
  hasViews?: boolean;
}

const REPORTS: ReportDef[] = [
  {
    id: 'blueprints', label: 'Blueprints', icon: BookOpen, hasViews: true,
    description: {
      unlearned: 'Blueprints at least one character still needs to learn.',
      extras: 'Spare blueprint copies and who is holding them.',
    },
  },
  {
    id: 'stencils', label: 'Stencils', icon: SprayCan, hasViews: true,
    description: {
      unlearned: 'Stencils at least one character still needs to learn.',
      extras: 'Spare stencil copies and who is holding them.',
    },
  },
  { id: 'arc-parts', label: 'ARC Parts', icon: Cpu,       description: 'Epic and Legendary ARC parts collected, with value.' },
  { id: 'workshop',  label: 'Workshop',  icon: Wrench,    description: 'Workshop materials stockpiled across characters.' },
  { id: 'loadouts',  label: 'Loadouts',  icon: Crosshair, description: 'Gun builds, guns held and total value per character.' },
];

const VIEWS: Array<{ id: ReportView; label: string; icon: LucideIcon }> = [
  { id: 'unlearned', label: 'Unlearned', icon: AlertCircle },
  { id: 'extras',    label: 'Extras',    icon: Package },
];

function CharacterFilter({
  characters,
  selectedId,
  onChange,
}: {
  characters: Character[];
  selectedId: number | null;
  onChange: (id: number | null) => void;
}) {
  if (characters.length === 0) return null;
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span className="text-xs text-arc-dim flex items-center gap-1 shrink-0 mr-1">
        <Users className="w-3.5 h-3.5" /> Character
      </span>
      <button
        onClick={() => onChange(null)}
        className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
          selectedId === null
            ? 'bg-arc-accent/15 text-arc-accent border-arc-accent/40'
            : 'text-arc-muted border-arc-border hover:text-arc-text hover:border-arc-muted/40'
        }`}
      >
        All
      </button>
      {characters.map(c => (
        <button
          key={c.id}
          onClick={() => onChange(c.id)}
          className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-colors"
          style={
            selectedId === c.id
              ? { backgroundColor: c.color + '25', color: c.color, borderColor: c.color + '60' }
              : { color: 'rgb(var(--arc-text-muted))', borderColor: 'rgb(var(--arc-border))' }
          }
        >
          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
          {c.name}
        </button>
      ))}
    </div>
  );
}

export default function Reports() {
  // Report, view and character live in the URL so a refresh or a bookmark
  // lands on the same report, and other pages can link straight to one.
  const [params, setParams] = useSearchParams();
  const { data: characters = [] } = useCharacters();

  const report = REPORTS.find(r => r.id === params.get('report')) ?? REPORTS[0];
  const view: ReportView = params.get('view') === 'extras' ? 'extras' : 'unlearned';
  const charParam = Number(params.get('character'));
  const selectedCharId = characters.some(c => c.id === charParam) ? charParam : null;

  const update = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) {
      if (value === null) next.delete(key); else next.set(key, value);
    }
    setParams(next, { replace: true });
  };

  const description = typeof report.description === 'string' ? report.description : report.description[view];

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-arc-text mb-1">Reports</h1>
        <p className="text-arc-muted text-sm">Collection gaps, spares and inventory across all your characters.</p>
      </div>

      {/* Report tabs: one row, scrolls sideways on narrow screens instead of wrapping. */}
      <nav className="border-b border-arc-border mb-5 -mx-1 overflow-x-auto" aria-label="Reports">
        <div className="flex gap-1 px-1 min-w-max">
          {REPORTS.map(({ id, label, icon: Icon }) => {
            const active = report.id === id;
            return (
              <button
                key={id}
                onClick={() => update({ report: id, view: null })}
                aria-current={active ? 'page' : undefined}
                className={`relative flex items-center gap-2 px-3.5 py-2.5 text-sm font-medium transition-colors whitespace-nowrap
                  ${active ? 'text-arc-text' : 'text-arc-muted hover:text-arc-text'}`}
              >
                <Icon className={`w-4 h-4 ${active ? 'text-arc-accent' : ''}`} />
                {label}
                {active && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-arc-accent" />}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Toolbar: what this report shows, its view switch, and the character filter. */}
      <div className="flex flex-col gap-3 mb-6">
        <div className="flex items-center justify-between gap-3 flex-wrap min-h-[34px]">
          <p className="text-sm text-arc-muted">{description}</p>
          {report.hasViews && (
            <div className="flex p-0.5 bg-arc-panel rounded-lg border border-arc-border" role="tablist" aria-label="View">
              {VIEWS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  role="tab"
                  aria-selected={view === id}
                  onClick={() => update({ view: id === 'unlearned' ? null : id })}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors
                    ${view === id ? 'bg-arc-card text-arc-text shadow-sm border border-arc-border' : 'text-arc-muted hover:text-arc-text border border-transparent'}`}
                >
                  <Icon className="w-3.5 h-3.5" />{label}
                </button>
              ))}
            </div>
          )}
        </div>
        <CharacterFilter
          characters={characters}
          selectedId={selectedCharId}
          onChange={id => update({ character: id === null ? null : String(id) })}
        />
      </div>

      {report.id === 'blueprints' && view === 'unlearned' && <UnlearnedReport selectedCharId={selectedCharId} />}
      {report.id === 'blueprints' && view === 'extras'    && <ExtrasInventory selectedCharId={selectedCharId} />}
      {report.id === 'stencils'   && view === 'unlearned' && <StencilUnlearnedReport selectedCharId={selectedCharId} />}
      {report.id === 'stencils'   && view === 'extras'    && <StencilExtrasInventory selectedCharId={selectedCharId} />}
      {report.id === 'arc-parts'  && <ArcPartsInventory selectedCharId={selectedCharId} />}
      {report.id === 'workshop'   && <WorkshopMaterialsInventory selectedCharId={selectedCharId} />}
      {report.id === 'loadouts'   && <LoadoutsReport selectedCharId={selectedCharId} />}
    </div>
  );
}

/**
 * Blueprints and stencils share the same "learned + extras" model, so their
 * report tabs share these lists. Each wrapper loads its data and maps it to
 * the neutral row shapes below.
 */
interface UnlearnedRow {
  id: number;
  name: string;
  icon: ReactNode;
  badge: ReactNode;
  characters: CharacterLearnStatus[];
  unlearned_count: number;
}

interface ExtrasRow {
  id: number;
  name: string;
  icon: ReactNode;
  badge: ReactNode;
  total_extras: number;
  character_breakdown: CharacterExtras[];
}

function UnlearnedReport({ selectedCharId }: { selectedCharId: number | null }) {
  const { data, isLoading } = useUnlearnedReport();
  const rows = data?.map((bp: UnlearnedBlueprint): UnlearnedRow => ({
    id: bp.id,
    name: bp.name,
    icon: <BlueprintIcon slug={bp.slug} name={bp.name} category={bp.category} size={40} />,
    badge: <CategoryBadge category={bp.category} />,
    characters: bp.characters,
    unlearned_count: bp.unlearned_count,
  }));
  return <UnlearnedList rows={rows} isLoading={isLoading} selectedCharId={selectedCharId} noun="blueprint" />;
}

function StencilUnlearnedReport({ selectedCharId }: { selectedCharId: number | null }) {
  const { data, isLoading } = useStencilUnlearnedReport();
  const rows = data?.map((s: UnlearnedStencil): UnlearnedRow => ({
    id: s.id,
    name: s.name,
    icon: <StencilIcon slug={s.slug} name={s.name} rarity={s.rarity} size={40} />,
    badge: <StencilRarityBadge rarity={s.rarity} />,
    characters: s.characters,
    unlearned_count: s.unlearned_count,
  }));
  return <UnlearnedList rows={rows} isLoading={isLoading} selectedCharId={selectedCharId} noun="stencil" />;
}

function ExtrasInventory({ selectedCharId }: { selectedCharId: number | null }) {
  const { data, isLoading } = useExtrasReport();
  const rows = data?.map((bp: ExtrasReport): ExtrasRow => ({
    id: bp.blueprint_id,
    name: bp.blueprint_name,
    icon: <BlueprintIcon slug={bp.slug} name={bp.blueprint_name} category={bp.category} size={40} />,
    badge: <CategoryBadge category={bp.category} />,
    total_extras: bp.total_extras,
    character_breakdown: bp.character_breakdown,
  }));
  return <ExtrasList rows={rows} isLoading={isLoading} selectedCharId={selectedCharId} noun="blueprint" />;
}

function StencilExtrasInventory({ selectedCharId }: { selectedCharId: number | null }) {
  const { data, isLoading } = useStencilExtrasReport();
  const rows = data?.map((s: StencilExtrasReport): ExtrasRow => ({
    id: s.stencil_id,
    name: s.stencil_name,
    icon: <StencilIcon slug={s.slug} name={s.stencil_name} rarity={s.rarity} size={40} />,
    badge: <StencilRarityBadge rarity={s.rarity} />,
    total_extras: s.total_extras,
    character_breakdown: s.character_breakdown,
  }));
  return <ExtrasList rows={rows} isLoading={isLoading} selectedCharId={selectedCharId} noun="stencil" />;
}

function UnlearnedList({ rows, isLoading, selectedCharId, noun }: {
  rows: UnlearnedRow[] | undefined;
  isLoading: boolean;
  selectedCharId: number | null;
  noun: 'blueprint' | 'stencil';
}) {
  const { data: characters = [] } = useCharacters();
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  if (isLoading) return <LoadingState />;
  if (!rows || characters.length === 0) return <EmptyState message={`No characters or ${noun}s found.`} />;

  const filtered = selectedCharId === null
    ? rows
    : rows.filter(row => row.characters.some(cs => cs.character_id === selectedCharId && !cs.learned));

  if (rows.length === 0) {
    return (
      <div className="card p-10 text-center">
        <div className="text-4xl mb-3">🎉</div>
        <p className="text-arc-text font-semibold">All {noun}s learned!</p>
        <p className="text-arc-muted text-sm mt-1">Every {noun} has been learned by all characters.</p>
      </div>
    );
  }

  if (filtered.length === 0) {
    return <EmptyState message={`No unlearned ${noun}s for the selected character.`} />;
  }

  const toggle = (id: number) => setExpanded(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const selectedChar = selectedCharId !== null ? characters.find(c => c.id === selectedCharId) : null;

  return (
    <div>
      <p className="text-sm text-arc-muted mb-4">
        <span className="text-arc-text font-semibold">{filtered.length}</span> {noun}{filtered.length !== 1 ? 's' : ''} not learned
        {selectedChar ? <> by <span className="font-semibold" style={{ color: selectedChar.color }}>{selectedChar.name}</span></> : ' by at least one character'}.
      </p>

      <div className="card overflow-hidden divide-y divide-arc-border/50">
        {filtered.map(row => {
          const isOpen     = expanded.has(row.id);
          const allMissing = row.unlearned_count === characters.length;

          return (
            <div key={row.id}>
              <button
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-arc-hover/40 transition-colors text-left"
                onClick={() => toggle(row.id)}
              >
                {row.icon}
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-arc-text">{row.name}</span>
                  <span className="ml-2 hidden sm:inline">{row.badge}</span>
                </div>

                <span className={`badge shrink-0 font-bold px-3 ${
                  allMissing
                    ? 'bg-arc-danger/15 text-arc-danger border border-arc-danger/30'
                    : 'bg-arc-extra/15 text-arc-extra border border-arc-extra/30'
                }`}>
                  {row.unlearned_count}/{characters.length} missing
                </span>

                {isOpen
                  ? <ChevronDown  className="w-4 h-4 text-arc-muted shrink-0" />
                  : <ChevronRight className="w-4 h-4 text-arc-muted shrink-0" />
                }
              </button>

              {isOpen && (
                <div className="bg-arc-bg/40 px-4 py-3 border-t border-arc-border/40">
                  <div className="flex flex-wrap gap-2">
                    {[...row.characters].sort((a, b) => a.character_name.localeCompare(b.character_name)).map(cs => (
                      <div
                        key={cs.character_id}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg border"
                        style={{
                          backgroundColor: cs.character_color + (cs.learned ? '15' : '10'),
                          borderColor:     cs.character_color + (cs.learned ? '40' : '30'),
                        }}
                      >
                        <span className={`text-base leading-none ${cs.learned ? 'text-arc-learned' : 'text-arc-danger'}`}>
                          {cs.learned ? '✓' : '✗'}
                        </span>
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cs.character_color }} />
                        <span className="text-sm" style={{ color: cs.character_color }}>{cs.character_name}</span>
                        {cs.character_label && (
                          <span className="text-xs text-arc-dim">
                            · {cs.character_label.split(',').map((l: string) => l.trim()).filter(Boolean).join(', ')}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ExtrasList({ rows, isLoading, selectedCharId, noun }: {
  rows: ExtrasRow[] | undefined;
  isLoading: boolean;
  selectedCharId: number | null;
  noun: 'blueprint' | 'stencil';
}) {
  const { data: characters = [] } = useCharacters();
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  if (isLoading) return <LoadingState />;
  if (!rows || rows.length === 0) return <EmptyState message={`No extra ${noun}s found across any characters.`} />;

  const filtered = selectedCharId === null
    ? rows
    : rows
        .filter(row => row.character_breakdown.some(cb => cb.character_id === selectedCharId && cb.extras > 0))
        .sort((a, b) => {
          const aCount = a.character_breakdown.find(cb => cb.character_id === selectedCharId)?.extras ?? 0;
          const bCount = b.character_breakdown.find(cb => cb.character_id === selectedCharId)?.extras ?? 0;
          return bCount - aCount;
        });

  const selectedChar = selectedCharId !== null ? characters.find(c => c.id === selectedCharId) : null;

  const totalExtras = filtered.reduce((s, row) => {
    if (selectedCharId === null) return s + row.total_extras;
    const cb = row.character_breakdown.find(c => c.character_id === selectedCharId);
    return s + (cb?.extras ?? 0);
  }, 0);

  const toggle = (id: number) => setExpanded(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  if (filtered.length === 0) {
    return <EmptyState message={`No extra ${noun}s found for the selected character.`} />;
  }

  return (
    <div>
      <p className="text-sm text-arc-muted mb-4">
        <span className="text-arc-text font-semibold">{totalExtras}</span> total extras across{' '}
        <span className="text-arc-text font-semibold">{filtered.length}</span> {noun} type{filtered.length !== 1 ? 's' : ''}
        {selectedChar ? <> for <span className="font-semibold" style={{ color: selectedChar.color }}>{selectedChar.name}</span></> : ''}.
      </p>

      <div className="card overflow-hidden divide-y divide-arc-border/50">
        {filtered.map(row => {
          const isOpen = expanded.has(row.id);
          const displayExtras = selectedCharId === null
            ? row.total_extras
            : (row.character_breakdown.find(cb => cb.character_id === selectedCharId)?.extras ?? 0);

          return (
            <div key={row.id}>
              <button
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-arc-hover/40 transition-colors text-left"
                onClick={() => toggle(row.id)}
              >
                {row.icon}
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-arc-text">{row.name}</span>
                  <span className="ml-2 hidden sm:inline">{row.badge}</span>
                </div>
                <span className="badge bg-arc-extra/15 text-arc-extra border border-arc-extra/30 text-sm font-bold px-3 shrink-0">
                  {displayExtras} extra{displayExtras !== 1 ? 's' : ''}
                </span>
                {isOpen
                  ? <ChevronDown className="w-4 h-4 text-arc-muted shrink-0" />
                  : <ChevronRight className="w-4 h-4 text-arc-muted shrink-0" />
                }
              </button>

              {isOpen && (
                <div className="bg-arc-bg/40 px-4 py-3 border-t border-arc-border/40">
                  <div className="flex flex-wrap gap-3">
                    {[...row.character_breakdown].sort((a, b) => a.character_name.localeCompare(b.character_name)).map(cb => (
                      <div
                        key={cb.character_id}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg border"
                        style={{ backgroundColor: cb.character_color + '15', borderColor: cb.character_color + '40' }}
                      >
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cb.character_color }} />
                        <span className="text-sm text-arc-muted">{cb.character_name}</span>
                        {cb.character_label && (
                          <span className="text-xs text-arc-dim">·{' '}
                            {cb.character_label.split(',').map(l => l.trim()).filter(Boolean).join(', ')}
                          </span>
                        )}
                        <span className="text-sm font-bold font-mono ml-1" style={{ color: cb.character_color }}>
                          ×{cb.extras}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ArcPartsInventory({ selectedCharId }: { selectedCharId: number | null }) {
  const { data, isLoading } = useArcPartsReport();
  const { data: characters = [] } = useCharacters();
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  if (isLoading) return <LoadingState />;
  if (!data || data.length === 0) return <EmptyState message="No ARC parts collected by any character yet." />;

  const filtered = selectedCharId === null
    ? data
    : data
        .filter(p => p.character_breakdown.some(cb => cb.character_id === selectedCharId && cb.count > 0))
        .sort((a, b) => {
          const aCount = a.character_breakdown.find(cb => cb.character_id === selectedCharId)?.count ?? 0;
          const bCount = b.character_breakdown.find(cb => cb.character_id === selectedCharId)?.count ?? 0;
          return bCount - aCount;
        });

  const selectedChar = selectedCharId !== null ? characters.find(c => c.id === selectedCharId) : null;

  const totalCount = filtered.reduce((s, p) => {
    if (selectedCharId === null) return s + p.total_count;
    return s + (p.character_breakdown.find(cb => cb.character_id === selectedCharId)?.count ?? 0);
  }, 0);

  const totalValue = filtered.reduce((s, p) => {
    if (selectedCharId === null) return s + p.total_value;
    const count = p.character_breakdown.find(cb => cb.character_id === selectedCharId)?.count ?? 0;
    return s + count * p.sell_value;
  }, 0);

  const toggle = (id: number) => setExpanded(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  if (filtered.length === 0) {
    return <EmptyState message="No ARC parts collected for the selected character." />;
  }

  const rarityOrder = { legendary: 0, epic: 1 };

  return (
    <div>
      <div className="flex items-baseline justify-between mb-4 flex-wrap gap-2">
        <p className="text-sm text-arc-muted">
          <span className="text-arc-text font-semibold">{totalCount}</span> part{totalCount !== 1 ? 's' : ''} across{' '}
          <span className="text-arc-text font-semibold">{filtered.length}</span> type{filtered.length !== 1 ? 's' : ''}
          {selectedChar ? <> for <span className="font-semibold" style={{ color: selectedChar.color }}>{selectedChar.name}</span></> : ''}.
        </p>
        {totalValue > 0 && (
          <p className="text-sm font-semibold text-arc-extra tabular-nums">
            {totalValue.toLocaleString()} total value
          </p>
        )}
      </div>

      <div className="card overflow-hidden divide-y divide-arc-border/50">
        {[...filtered].sort((a, b) => (rarityOrder[a.rarity] ?? 9) - (rarityOrder[b.rarity] ?? 9)).map((part: ArcPartsReport) => {
          const isOpen = expanded.has(part.part_id);
          const displayCount = selectedCharId === null
            ? part.total_count
            : (part.character_breakdown.find(cb => cb.character_id === selectedCharId)?.count ?? 0);
          const displayValue = selectedCharId === null
            ? part.total_value
            : (part.character_breakdown.find(cb => cb.character_id === selectedCharId)?.value ?? 0);

          const badgeClass = part.rarity === 'legendary'
            ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
            : 'bg-purple-500/15 text-purple-400 border border-purple-500/30';

          return (
            <div key={part.part_id}>
              <button
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-arc-hover/40 transition-colors text-left"
                onClick={() => toggle(part.part_id)}
              >
                <ArcPartIcon slug={part.slug} name={part.part_name} rarity={part.rarity} size={40} />
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-arc-text">{part.part_name}</span>
                  <span className={`ml-2 text-[10px] font-semibold px-1.5 py-0.5 rounded border hidden sm:inline-block ${badgeClass}`}>
                    {part.rarity === 'legendary' ? '👑' : '⚡'} {part.rarity}
                  </span>
                  <p className="text-xs text-arc-dim mt-0.5">from {part.source}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className={`badge text-sm font-bold px-3 ${badgeClass}`}>×{displayCount}</p>
                  {displayValue > 0 && (
                    <p className="text-xs text-arc-extra font-semibold tabular-nums mt-0.5">
                      {displayValue.toLocaleString()}
                    </p>
                  )}
                </div>
                {isOpen
                  ? <ChevronDown  className="w-4 h-4 text-arc-muted shrink-0" />
                  : <ChevronRight className="w-4 h-4 text-arc-muted shrink-0" />
                }
              </button>

              {isOpen && (
                <div className="bg-arc-bg/40 px-4 py-3 border-t border-arc-border/40">
                  <div className="flex flex-wrap gap-3">
                    {[...part.character_breakdown]
                      .sort((a, b) => a.character_name.localeCompare(b.character_name))
                      .map(cb => (
                        <div
                          key={cb.character_id}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg border"
                          style={{ backgroundColor: cb.character_color + '15', borderColor: cb.character_color + '40' }}
                        >
                          <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cb.character_color }} />
                          <span className="text-sm text-arc-muted">{cb.character_name}</span>
                          {cb.character_label && (
                            <span className="text-xs text-arc-dim">·{' '}
                              {cb.character_label.split(',').map(l => l.trim()).filter(Boolean).join(', ')}
                            </span>
                          )}
                          <span className="text-sm font-bold font-mono ml-1" style={{ color: cb.character_color }}>
                            ×{cb.count}
                          </span>
                          {cb.value > 0 && (
                            <span className="text-xs text-arc-extra tabular-nums">
                              {cb.value.toLocaleString()}
                            </span>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WorkshopMaterialsInventory({ selectedCharId }: { selectedCharId: number | null }) {
  const { data, isLoading } = useWorkshopMaterialsReport();
  const { data: characters = [] } = useCharacters();
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  if (isLoading) return <LoadingState />;
  if (!data || data.length === 0) return <EmptyState message="No workshop materials collected by any character yet." />;

  const filtered = selectedCharId === null
    ? data
    : data
        .filter(m => m.character_breakdown.some(cb => cb.character_id === selectedCharId && cb.count > 0))
        .sort((a, b) => {
          const aCount = a.character_breakdown.find(cb => cb.character_id === selectedCharId)?.count ?? 0;
          const bCount = b.character_breakdown.find(cb => cb.character_id === selectedCharId)?.count ?? 0;
          return bCount - aCount;
        });

  const selectedChar = selectedCharId !== null ? characters.find(c => c.id === selectedCharId) : null;

  const totalCount = filtered.reduce((s, m) => {
    if (selectedCharId === null) return s + m.total_count;
    return s + (m.character_breakdown.find(cb => cb.character_id === selectedCharId)?.count ?? 0);
  }, 0);

  const toggle = (id: number) => setExpanded(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  if (filtered.length === 0) {
    return <EmptyState message="No workshop materials collected for the selected character." />;
  }

  return (
    <div>
      <p className="text-sm text-arc-muted mb-4">
        <span className="text-arc-text font-semibold">{totalCount}</span> material{totalCount !== 1 ? 's' : ''} across{' '}
        <span className="text-arc-text font-semibold">{filtered.length}</span> type{filtered.length !== 1 ? 's' : ''}
        {selectedChar ? <> for <span className="font-semibold" style={{ color: selectedChar.color }}>{selectedChar.name}</span></> : ''}.
      </p>

      <div className="card overflow-hidden divide-y divide-arc-border/50">
        {filtered.map((material: WorkshopMaterialsReport) => {
          const isOpen = expanded.has(material.material_id);
          const displayCount = selectedCharId === null
            ? material.total_count
            : (material.character_breakdown.find(cb => cb.character_id === selectedCharId)?.count ?? 0);

          return (
            <div key={material.material_id}>
              <button
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-arc-hover/40 transition-colors text-left"
                onClick={() => toggle(material.material_id)}
              >
                <WorkshopMaterialIcon slug={material.slug} name={material.material_name} size={40} />
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-arc-text">{material.material_name}</span>
                </div>
                <span className="badge bg-sky-500/15 text-sky-400 border border-sky-500/30 text-sm font-bold px-3 shrink-0">
                  ×{displayCount}
                </span>
                {isOpen
                  ? <ChevronDown  className="w-4 h-4 text-arc-muted shrink-0" />
                  : <ChevronRight className="w-4 h-4 text-arc-muted shrink-0" />
                }
              </button>

              {isOpen && (
                <div className="bg-arc-bg/40 px-4 py-3 border-t border-arc-border/40">
                  <div className="flex flex-wrap gap-3">
                    {[...material.character_breakdown].sort((a, b) => a.character_name.localeCompare(b.character_name)).map(cb => (
                      <div
                        key={cb.character_id}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg border"
                        style={{ backgroundColor: cb.character_color + '15', borderColor: cb.character_color + '40' }}
                      >
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cb.character_color }} />
                        <span className="text-sm text-arc-muted">{cb.character_name}</span>
                        {cb.character_label && (
                          <span className="text-xs text-arc-dim">·{' '}
                            {cb.character_label.split(',').map(l => l.trim()).filter(Boolean).join(', ')}
                          </span>
                        )}
                        <span className="text-sm font-bold font-mono ml-1" style={{ color: cb.character_color }}>
                          ×{cb.count}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="text-center py-12">
      <div className="inline-block w-6 h-6 border-2 border-arc-accent/30 border-t-arc-accent rounded-full animate-spin mb-3" />
      <p className="text-arc-muted text-sm">Loading report…</p>
    </div>
  );
}

// ── Loadouts ───────────────────────────────────────────────────────────────────

const ROMAN = ['', 'I', 'II', 'III', 'IV'];

function LoadoutsReport({ selectedCharId }: { selectedCharId: number | null }) {
  const { data, isLoading } = useGunConfigsReport();
  const [expanded, setExpanded] = useState<number | null>(null);

  if (isLoading) return <EmptyState message="Loading loadouts…" />;
  if (!data) return <EmptyState message="No loadout data available." />;

  const rows = selectedCharId === null
    ? data.characters
    : data.characters.filter(r => r.character_id === selectedCharId);

  const withBuilds = rows.filter(r => r.config_count > 0);
  if (withBuilds.length === 0) {
    return <EmptyState message="No gun builds tracked yet. Create one on the Loadouts page." />;
  }

  // Totals follow the filter so a single-character view doesn't show global sums.
  const totals = withBuilds.reduce(
    (acc, r) => ({
      config_count: acc.config_count + r.config_count,
      total_guns: acc.total_guns + r.total_guns,
      total_value: acc.total_value + r.total_value,
    }),
    { config_count: 0, total_guns: 0, total_value: 0 },
  );

  return (
    <div className="space-y-6">
      {/* Summary tiles */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Builds', value: totals.config_count },
          { label: 'Guns held', value: totals.total_guns },
          { label: 'Total value', value: totals.total_value, accent: true },
        ].map(({ label, value, accent }) => (
          <div key={label} className="card p-4">
            <p className="text-[10px] text-arc-dim uppercase tracking-wider">{label}</p>
            <p className={`text-xl font-semibold tabular-nums mt-1 ${accent ? 'text-arc-extra' : 'text-arc-text'}`}>
              {value.toLocaleString()}
            </p>
          </div>
        ))}
      </div>

      {/* Per character */}
      <div className="space-y-3">
        {withBuilds.map(row => {
          const isOpen = expanded === row.character_id;
          return (
            <div key={row.character_id} className="card overflow-hidden">
              <button
                onClick={() => setExpanded(isOpen ? null : row.character_id)}
                className="w-full flex items-center gap-3 p-4 text-left hover:bg-arc-hover transition-colors"
              >
                {isOpen
                  ? <ChevronDown className="w-4 h-4 text-arc-dim shrink-0" />
                  : <ChevronRight className="w-4 h-4 text-arc-dim shrink-0" />}
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: row.character_color }} />
                <span className="font-medium text-arc-text">{row.character_name}</span>
                {row.character_label && (
                  <span className="text-xs text-arc-dim">{row.character_label}</span>
                )}
                <span className="ml-auto flex items-center gap-4 text-sm">
                  <span className="text-arc-muted tabular-nums">
                    {row.config_count} build{row.config_count === 1 ? '' : 's'}
                  </span>
                  <span className="text-arc-muted tabular-nums">
                    {row.total_guns} gun{row.total_guns === 1 ? '' : 's'}
                  </span>
                  <span className="text-arc-extra font-semibold tabular-nums">
                    {row.total_value.toLocaleString()}
                  </span>
                </span>
              </button>

              {isOpen && (
                <div className="border-t border-arc-border divide-y divide-arc-border">
                  {row.configs.map(cfg => (
                    <div key={cfg.id} className="p-4 flex items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-arc-text">
                          {cfg.weapon_name}
                          {cfg.tier != null && (
                            <span className="ml-1.5 text-[10px] font-bold text-arc-accent">
                              {ROMAN[cfg.tier] ?? cfg.tier}
                            </span>
                          )}
                          {cfg.name && <span className="text-arc-dim"> · {cfg.name}</span>}
                        </p>
                        <p className="text-xs text-arc-dim mt-0.5">
                          {cfg.mods.length === 0
                            ? 'No mods'
                            : cfg.mods.map(m => m.name).join(', ')}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs text-arc-muted tabular-nums">
                          {cfg.quantity} × {cfg.unit_value.toLocaleString()}
                        </p>
                        <p className="text-sm text-arc-extra font-semibold tabular-nums">
                          {cfg.total_value.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Weapon and mod breakdowns are aggregated across every character, so
          they only make sense in the unfiltered view. */}
      {selectedCharId === null && data.weapons.length > 0 && (
        <div className="card p-4">
          <h3 className="text-sm font-semibold text-arc-text mb-3">Most-built weapons</h3>
          <div className="space-y-1.5">
            {data.weapons.map(w => (
              <div key={w.weapon_id} className="flex items-center gap-3 text-sm">
                <span className="text-arc-muted flex-1 truncate">
                  {w.weapon_name}
                  <span className="text-arc-dim text-xs ml-1.5">{w.weapon_class}</span>
                </span>
                <span className="text-xs text-arc-dim tabular-nums">
                  {w.config_count} build{w.config_count === 1 ? '' : 's'}
                </span>
                <span className="text-arc-text tabular-nums w-12 text-right">{w.total_guns}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedCharId === null && data.mods.length > 0 && (
        <div className="card p-4">
          <h3 className="text-sm font-semibold text-arc-text mb-1">Mod usage</h3>
          <p className="text-xs text-arc-dim mb-3">
            Guns carrying each mod, counting how many of every build you hold — so the mods
            worth keeping in production sort to the top.
          </p>

          <div className="space-y-4">
            {data.slots.map(slot => {
              const mods = data.mods.filter(m => m.slot === slot.slot);
              if (!mods.length) return null;
              const slotMax = Math.max(...mods.map(m => m.gun_count), 1);

              return (
                <div key={slot.slot}>
                  <h4 className="text-[11px] font-semibold uppercase tracking-wider text-arc-muted mb-2">
                    {slot.label}
                  </h4>
                  <div className="space-y-1.5">
                    {mods.map(mod => (
                      <div key={mod.mod_id} className="flex items-center gap-3 text-sm">
                        <span className="text-arc-muted flex-1 min-w-0 truncate" title={mod.mod_name}>
                          {mod.mod_name}
                          {!mod.craftable && (
                            <span className="text-amber-400 ml-1" title="Loot-only — can't be crafted">◆</span>
                          )}
                        </span>

                        {/* Bar is scaled within its slot: slots have very
                            different totals, so a global scale would flatten
                            every row outside the busiest one. */}
                        <span className="hidden sm:block w-24 h-1.5 bg-arc-border rounded-full overflow-hidden shrink-0">
                          <span
                            className="block h-full bg-sky-400/70 rounded-full"
                            style={{ width: `${(mod.gun_count / slotMax) * 100}%` }}
                          />
                        </span>

                        <span className="text-xs text-arc-dim tabular-nums w-16 text-right shrink-0">
                          {mod.build_count} build{mod.build_count === 1 ? '' : 's'}
                        </span>
                        <span className="text-arc-text tabular-nums w-10 text-right shrink-0">{mod.gun_count}</span>
                        <span className="text-arc-extra tabular-nums w-20 text-right shrink-0 hidden sm:inline">
                          {mod.sell_value === 0 ? '—' : mod.total_value.toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="card p-10 text-center">
      <BarChart3 className="w-8 h-8 text-arc-dim mx-auto mb-3" />
      <p className="text-arc-muted text-sm">{message}</p>
    </div>
  );
}
