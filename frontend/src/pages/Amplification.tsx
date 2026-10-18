import { useState, useMemo, useCallback } from 'react';
import { Search, RotateCcw } from 'lucide-react';
import type { AmplificationComponent, AmplificationKind } from '../types';
import {
  useAmplificationComponents,
  useCharacters,
  useAmplificationTrackingMap,
  useUpsertAmplificationTracking,
  useCharacterActivity,
} from '../hooks/useApi';
import LastUpdated from '../components/LastUpdated';
import AmplificationCard from '../components/AmplificationCard';

type KindFilter = 'all' | AmplificationKind;

const SECTIONS: Array<{ kind: AmplificationKind; title: string; blurb: string }> = [
  {
    kind: 'module',
    title: 'Amplification Modules',
    blurb: 'One module takes a weapon to Level 5. Use the Mk. that matches the weapon’s base rarity.',
  },
  {
    kind: 'material',
    title: 'Amplification Materials',
    blurb: 'Spent on individual amplifications once a weapon is Level 5. Amplifications that cost ARC parts use your ARC Parts counts.',
  },
];

export default function Amplification() {
  const { data: characters = [] } = useCharacters();
  const { data: components = [] } = useAmplificationComponents();

  const [selectedCharId, setSelectedCharId] = useState<number | null>(null);
  const [kindFilter, setKindFilter]         = useState<KindFilter>('all');
  const [search, setSearch]                 = useState('');

  const activeCharId = selectedCharId ?? characters[0]?.id ?? null;
  const activity     = useCharacterActivity(activeCharId);
  const activeChar   = characters.find(c => c.id === activeCharId);

  const { trackingMap } = useAmplificationTrackingMap(activeCharId);
  const upsert          = useUpsertAmplificationTracking();

  const filtered = useMemo(() => {
    let list = components;
    if (kindFilter !== 'all') list = list.filter(c => c.kind === kindFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(c => c.name.toLowerCase().includes(q) || (c.source ?? '').toLowerCase().includes(q));
    }
    return list;
  }, [components, kindFilter, search]);

  const handleSetCount = useCallback((componentId: number, count: number) => {
    if (!activeCharId) return;
    upsert.mutate({ character_id: activeCharId, component_id: componentId, count });
  }, [activeCharId, upsert]);

  const countOf = (c: AmplificationComponent) => trackingMap[c.id]?.count ?? 0;
  const totalHeld   = components.reduce((s, c) => s + countOf(c), 0);
  const totalValue  = components.reduce((s, c) => s + countOf(c) * (c.sell_value ?? 0), 0);
  const heldUnpriced = components.some(c => c.sell_value === null && countOf(c) > 0);
  const kindCount = (k: AmplificationKind) => components.filter(c => c.kind === k).length;

  if (characters.length === 0) {
    return (
      <div className="p-8 text-center">
        <p className="text-arc-muted mb-3">No characters yet. Create a character first.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-arc-border bg-arc-panel/50 shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-arc-text">Amplification</h1>
            <p className="text-xs text-arc-dim mt-0.5">Modules and materials for Level 5 amplified weapons</p>
          </div>
          {activeChar && totalHeld > 0 && (
            <div className="text-right">
              <p className="text-sm text-arc-muted">
                <span className="text-arc-text font-medium">{totalHeld}</span> held
              </p>
              <p className="text-sm font-semibold text-arc-extra tabular-nums"
                title={heldUnpriced ? 'Excludes components with an unknown value' : undefined}>
                {totalValue.toLocaleString()} total value{heldUnpriced ? '*' : ''}
              </p>
            </div>
          )}
        </div>

        {/* Character selector */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <span className="text-xs text-arc-dim uppercase tracking-wide shrink-0">Character:</span>
          <div className="flex flex-wrap gap-2">
            {characters.map(char => (
              <button
                key={char.id}
                onClick={() => setSelectedCharId(char.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors
                  ${activeCharId === char.id ? '' : 'border-arc-border text-arc-muted hover:text-arc-text hover:border-arc-muted/60'}`}
                style={activeCharId === char.id ? {
                  backgroundColor: char.color + '20',
                  borderColor: char.color + '60',
                  color: char.color,
                } : {}}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: activeCharId === char.id ? char.color : 'rgb(var(--arc-border))' }}
                />
                {char.name}
                {char.label && (
                  <span className="text-xs opacity-70">
                    · {char.label.split(',').map((l: string) => l.trim()).filter(Boolean).slice(0, 2).join(', ')}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* When this character last touched this area. */}
          <LastUpdated value={activity?.amplification ?? null} label="Updated" className="ml-auto" />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-arc-dim" />
            <input
              className="input pl-8 py-1.5 text-sm w-56"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search components…"
            />
          </div>

          <div className="flex items-center gap-1 flex-wrap">
            {([
              { id: 'all',      label: `All (${components.length})` },
              { id: 'module',   label: `Modules (${kindCount('module')})` },
              { id: 'material', label: `Materials (${kindCount('material')})` },
            ] as const).map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setKindFilter(id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors
                  ${kindFilter === id
                    ? 'bg-arc-accent/15 text-arc-accent border-arc-accent/30'
                    : 'border-arc-border text-arc-muted hover:border-arc-muted/60 hover:text-arc-text'}`}
              >
                {label}
              </button>
            ))}
          </div>

          {(search || kindFilter !== 'all') && (
            <button
              onClick={() => { setSearch(''); setKindFilter('all'); }}
              className="btn-ghost text-xs gap-1 py-1.5 ml-auto"
            >
              <RotateCcw className="w-3 h-3" /> Reset
            </button>
          )}
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-auto p-6">
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-arc-dim">No components match your filters.</p>
          </div>
        ) : (
          SECTIONS.map(({ kind, title, blurb }) => {
            const items = filtered.filter(c => c.kind === kind);
            if (!items.length) return null;
            return (
              <section key={kind} className="mb-8 last:mb-0">
                <h2 className="text-sm font-semibold text-arc-text uppercase tracking-wider">{title}</h2>
                <p className="text-xs text-arc-dim mt-0.5 mb-3">{blurb}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {items.map(c => (
                    <AmplificationCard key={c.id} component={c} trackingMap={trackingMap} onSetCount={handleSetCount} />
                  ))}
                </div>
              </section>
            );
          })
        )}

        {heldUnpriced && (
          <p className="text-[11px] text-arc-dim mt-6">* Total value excludes components whose sell value isn’t known yet.</p>
        )}
      </div>
    </div>
  );
}
