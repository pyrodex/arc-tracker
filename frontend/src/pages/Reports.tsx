import { useState } from 'react';
import { BarChart3, AlertCircle, Package, Cpu, ChevronDown, ChevronRight, Users } from 'lucide-react';
import { useUnlearnedReport, useExtrasReport, useArcPartsReport, useCharacters } from '../hooks/useApi';
import type { UnlearnedBlueprint, ExtrasReport, ArcPartsReport, CharacterLearnStatus, Character } from '../types';
import { CategoryBadge } from '../components/CategoryIcon';
import BlueprintIcon from '../components/BlueprintIcon';
import ArcPartIcon from '../components/ArcPartIcon';

type ReportTab = 'unlearned' | 'extras' | 'arc-parts';

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
    <div className="flex items-center gap-2 flex-wrap mb-6">
      <span className="text-xs text-arc-muted flex items-center gap-1 shrink-0">
        <Users className="w-3.5 h-3.5" /> Filter:
      </span>
      <button
        onClick={() => onChange(null)}
        className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
          selectedId === null
            ? 'bg-arc-accent/15 text-arc-accent border-arc-accent/40'
            : 'text-arc-muted border-arc-border hover:text-arc-text hover:border-arc-muted/40'
        }`}
      >
        All Characters
      </button>
      {characters.map(c => (
        <button
          key={c.id}
          onClick={() => onChange(c.id)}
          className="px-3 py-1 rounded-full text-xs font-medium border transition-colors"
          style={
            selectedId === c.id
              ? { backgroundColor: c.color + '25', color: c.color, borderColor: c.color + '60' }
              : { color: 'var(--arc-muted)', borderColor: 'var(--arc-border)' }
          }
        >
          {c.name}
        </button>
      ))}
    </div>
  );
}

export default function Reports() {
  const [tab, setTab] = useState<ReportTab>('unlearned');
  const [selectedCharId, setSelectedCharId] = useState<number | null>(null);
  const { data: characters = [] } = useCharacters();

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-arc-text mb-1">Reports</h1>
        <p className="text-arc-muted text-sm">Analyze blueprint collection gaps and extras across all characters.</p>
      </div>

      <div className="flex gap-1 p-1 bg-arc-panel rounded-lg w-fit mb-6 border border-arc-border flex-wrap">
        {([
          { id: 'unlearned',  label: 'Unlearned Blueprints', icon: AlertCircle },
          { id: 'extras',     label: 'Extras Inventory',     icon: Package },
          { id: 'arc-parts',  label: 'ARC Parts',            icon: Cpu },
        ] as const).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors
              ${tab === id ? 'bg-arc-card text-arc-text border border-arc-border' : 'text-arc-muted hover:text-arc-text'}`}
          >
            <Icon className="w-4 h-4" />{label}
          </button>
        ))}
      </div>

      <CharacterFilter
        characters={characters}
        selectedId={selectedCharId}
        onChange={setSelectedCharId}
      />

      {tab === 'unlearned' && <UnlearnedReport selectedCharId={selectedCharId} />}
      {tab === 'extras'    && <ExtrasInventory selectedCharId={selectedCharId} />}
      {tab === 'arc-parts' && <ArcPartsInventory selectedCharId={selectedCharId} />}
    </div>
  );
}

function UnlearnedReport({ selectedCharId }: { selectedCharId: number | null }) {
  const { data, isLoading } = useUnlearnedReport();
  const { data: characters = [] } = useCharacters();
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  if (isLoading) return <LoadingState />;
  if (!data || characters.length === 0) return <EmptyState message="No characters or blueprints found." />;

  const filtered = selectedCharId === null
    ? data
    : data.filter(bp => bp.characters.some(cs => cs.character_id === selectedCharId && !cs.learned));

  if (data.length === 0) {
    return (
      <div className="card p-10 text-center">
        <div className="text-4xl mb-3">🎉</div>
        <p className="text-arc-text font-semibold">All blueprints learned!</p>
        <p className="text-arc-muted text-sm mt-1">Every blueprint has been learned by all characters.</p>
      </div>
    );
  }

  if (filtered.length === 0) {
    return <EmptyState message="No unlearned blueprints for the selected character." />;
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
        <span className="text-arc-text font-semibold">{filtered.length}</span> blueprint{filtered.length !== 1 ? 's' : ''} not learned
        {selectedChar ? <> by <span className="font-semibold" style={{ color: selectedChar.color }}>{selectedChar.name}</span></> : ' by at least one character'}.
      </p>

      <div className="card overflow-hidden divide-y divide-arc-border/50">
        {filtered.map((bp: UnlearnedBlueprint) => {
          const isOpen    = expanded.has(bp.id);
          const allMissing = bp.unlearned_count === characters.length;

          return (
            <div key={bp.id}>
              <button
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-arc-hover/40 transition-colors text-left"
                onClick={() => toggle(bp.id)}
              >
                <BlueprintIcon slug={bp.slug} name={bp.name} category={bp.category} size={40} />
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-arc-text">{bp.name}</span>
                  <span className="ml-2 hidden sm:inline"><CategoryBadge category={bp.category} /></span>
                </div>

                <span className={`badge shrink-0 font-bold px-3 ${
                  allMissing
                    ? 'bg-arc-danger/15 text-arc-danger border border-arc-danger/30'
                    : 'bg-arc-extra/15 text-arc-extra border border-arc-extra/30'
                }`}>
                  {bp.unlearned_count}/{characters.length} missing
                </span>

                {isOpen
                  ? <ChevronDown  className="w-4 h-4 text-arc-muted shrink-0" />
                  : <ChevronRight className="w-4 h-4 text-arc-muted shrink-0" />
                }
              </button>

              {isOpen && (
                <div className="bg-arc-bg/40 px-4 py-3 border-t border-arc-border/40">
                  <div className="flex flex-wrap gap-2">
                    {[...(bp.characters as CharacterLearnStatus[])].sort((a, b) => a.character_name.localeCompare(b.character_name)).map(cs => (
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

function ExtrasInventory({ selectedCharId }: { selectedCharId: number | null }) {
  const { data, isLoading } = useExtrasReport();
  const { data: characters = [] } = useCharacters();
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  if (isLoading) return <LoadingState />;
  if (!data || data.length === 0) return <EmptyState message="No extra blueprints found across any characters." />;

  const filtered = selectedCharId === null
    ? data
    : data
        .filter(bp => bp.character_breakdown.some(cb => cb.character_id === selectedCharId && cb.extras > 0))
        .sort((a, b) => {
          const aCount = a.character_breakdown.find(cb => cb.character_id === selectedCharId)?.extras ?? 0;
          const bCount = b.character_breakdown.find(cb => cb.character_id === selectedCharId)?.extras ?? 0;
          return bCount - aCount;
        });

  const selectedChar = selectedCharId !== null ? characters.find(c => c.id === selectedCharId) : null;

  const totalExtras = filtered.reduce((s, bp) => {
    if (selectedCharId === null) return s + bp.total_extras;
    const cb = bp.character_breakdown.find(c => c.character_id === selectedCharId);
    return s + (cb?.extras ?? 0);
  }, 0);

  const toggle = (id: number) => setExpanded(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  if (filtered.length === 0) {
    return <EmptyState message="No extra blueprints found for the selected character." />;
  }

  return (
    <div>
      <p className="text-sm text-arc-muted mb-4">
        <span className="text-arc-text font-semibold">{totalExtras}</span> total extras across{' '}
        <span className="text-arc-text font-semibold">{filtered.length}</span> blueprint type{filtered.length !== 1 ? 's' : ''}
        {selectedChar ? <> for <span className="font-semibold" style={{ color: selectedChar.color }}>{selectedChar.name}</span></> : ''}.
      </p>

      <div className="card overflow-hidden divide-y divide-arc-border/50">
        {filtered.map((bp: ExtrasReport) => {
          const isOpen = expanded.has(bp.blueprint_id);
          const displayExtras = selectedCharId === null
            ? bp.total_extras
            : (bp.character_breakdown.find(cb => cb.character_id === selectedCharId)?.extras ?? 0);

          return (
            <div key={bp.blueprint_id}>
              <button
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-arc-hover/40 transition-colors text-left"
                onClick={() => toggle(bp.blueprint_id)}
              >
                <BlueprintIcon slug={bp.slug} name={bp.blueprint_name} category={bp.category} size={40} />
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-arc-text">{bp.blueprint_name}</span>
                  <span className="ml-2 hidden sm:inline"><CategoryBadge category={bp.category} /></span>
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
                    {[...bp.character_breakdown].sort((a, b) => a.character_name.localeCompare(b.character_name)).map(cb => (
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
    const cb = p.character_breakdown.find(c => c.character_id === selectedCharId);
    return s + (cb?.count ?? 0);
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
      <p className="text-sm text-arc-muted mb-4">
        <span className="text-arc-text font-semibold">{totalCount}</span> total part{totalCount !== 1 ? 's' : ''} across{' '}
        <span className="text-arc-text font-semibold">{filtered.length}</span> type{filtered.length !== 1 ? 's' : ''}
        {selectedChar ? <> for <span className="font-semibold" style={{ color: selectedChar.color }}>{selectedChar.name}</span></> : ''}.
      </p>

      <div className="card overflow-hidden divide-y divide-arc-border/50">
        {[...filtered].sort((a, b) => (rarityOrder[a.rarity] ?? 9) - (rarityOrder[b.rarity] ?? 9)).map((part: ArcPartsReport) => {
          const isOpen = expanded.has(part.part_id);
          const displayCount = selectedCharId === null
            ? part.total_count
            : (part.character_breakdown.find(cb => cb.character_id === selectedCharId)?.count ?? 0);

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
                <span className={`badge text-sm font-bold px-3 shrink-0 ${badgeClass}`}>
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

function EmptyState({ message }: { message: string }) {
  return (
    <div className="card p-10 text-center">
      <BarChart3 className="w-8 h-8 text-arc-dim mx-auto mb-3" />
      <p className="text-arc-muted text-sm">{message}</p>
    </div>
  );
}
