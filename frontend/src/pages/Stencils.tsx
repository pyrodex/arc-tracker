import { useState, useMemo, useCallback } from 'react';
import { Search, Filter, CheckSquare, Square, RotateCcw } from 'lucide-react';
import type { Stencil, StencilRarity, StencilTrackingMap } from '../types';
import {
  useStencils,
  useCharacters,
  useStencilTrackingMap,
  useUpsertStencilTracking,
  useCharacterActivity,
} from '../hooks/useApi';
import LastUpdated from '../components/LastUpdated';
import StencilCard from '../components/StencilCard';
import { STENCIL_RARITIES, stencilRarityMeta, stencilWeapons } from '../components/StencilRarity';

type FilterStatus = 'all' | 'learned' | 'not-learned';

export default function Stencils() {
  const { data: characters = [] } = useCharacters();
  const { data: stencils = [] }   = useStencils();

  const [selectedCharId, setSelectedCharId] = useState<number | null>(null);
  const [rarityFilter, setRarityFilter]     = useState<StencilRarity | 'all'>('all');
  const [weaponFilter, setWeaponFilter]     = useState<string>('all');
  const [statusFilter, setStatusFilter]     = useState<FilterStatus>('all');
  const [search, setSearch]                 = useState('');

  const activeCharId = selectedCharId ?? characters[0]?.id ?? null;
  const activity     = useCharacterActivity(activeCharId);
  const activeChar   = characters.find(c => c.id === activeCharId);

  const { trackingMap } = useStencilTrackingMap(activeCharId);
  const upsert          = useUpsertStencilTracking();

  // Only offer rarities and weapons that actually have stencils.
  const rarityCounts = useMemo(() => {
    const counts = new Map<StencilRarity, number>();
    for (const s of stencils) counts.set(s.rarity, (counts.get(s.rarity) ?? 0) + 1);
    return STENCIL_RARITIES.filter(r => counts.has(r)).map(r => ({ rarity: r, count: counts.get(r)! }));
  }, [stencils]);

  const weaponOptions = useMemo(
    () => [...new Set(stencils.flatMap(s => stencilWeapons(s.weapons)))].sort((a, b) => a.localeCompare(b)),
    [stencils],
  );

  const filtered = useMemo(() => {
    let list = stencils;
    if (rarityFilter !== 'all') list = list.filter(s => s.rarity === rarityFilter);
    if (weaponFilter !== 'all') list = list.filter(s => stencilWeapons(s.weapons).includes(weaponFilter));
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(s => s.name.toLowerCase().includes(q) || (s.weapons ?? '').toLowerCase().includes(q));
    }
    if (statusFilter === 'learned')     list = list.filter(s => trackingMap[s.id]?.learned === 1);
    if (statusFilter === 'not-learned') list = list.filter(s => !trackingMap[s.id]?.learned);
    return list;
  }, [stencils, rarityFilter, weaponFilter, search, statusFilter, trackingMap]);

  const handleToggleLearned = useCallback((stencilId: number, learned: boolean) => {
    if (!activeCharId) return;
    upsert.mutate({ character_id: activeCharId, stencil_id: stencilId, learned, extras: trackingMap[stencilId]?.extras ?? 0 });
  }, [activeCharId, trackingMap, upsert]);

  const handleSetExtras = useCallback((stencilId: number, extras: number) => {
    if (!activeCharId) return;
    upsert.mutate({ character_id: activeCharId, stencil_id: stencilId, learned: trackingMap[stencilId]?.learned === 1, extras });
  }, [activeCharId, trackingMap, upsert]);

  const learnedCount = stencils.filter(s => trackingMap[s.id]?.learned === 1).length;
  const hasFilters   = search || rarityFilter !== 'all' || weaponFilter !== 'all' || statusFilter !== 'all';

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
          <h1 className="text-2xl font-bold text-arc-text">Stencils</h1>
          {activeChar && (
            <span className="text-sm text-arc-muted">
              <span className="text-arc-text font-medium">{learnedCount}</span> / {stencils.length} learned
            </span>
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
                <span className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: activeCharId === char.id ? char.color : 'rgb(var(--arc-border))' }} />
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
          <LastUpdated value={activity?.stencils ?? null} label="Updated" className="ml-auto" />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-arc-dim" />
            <input
              className="input pl-8 py-1.5 text-sm w-60"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search stencils or weapons…"
            />
          </div>

          <div className="flex items-center gap-1 flex-wrap">
            <button
              onClick={() => setRarityFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors
                ${rarityFilter === 'all'
                  ? 'bg-arc-accent/15 text-arc-accent border-arc-accent/30'
                  : 'border-arc-border text-arc-muted hover:border-arc-muted/60 hover:text-arc-text'}`}
            >
              All ({stencils.length})
            </button>
            {rarityCounts.map(({ rarity, count }) => {
              const meta = stencilRarityMeta(rarity);
              return (
                <button
                  key={rarity}
                  onClick={() => setRarityFilter(rarity)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors
                    ${rarityFilter === rarity
                      ? `${meta.bg} ${meta.text} ${meta.border}`
                      : 'border-arc-border text-arc-muted hover:border-arc-muted/60 hover:text-arc-text'}`}
                >
                  {meta.label} ({count})
                </button>
              );
            })}
          </div>

          <select
            className="input py-1.5 text-xs w-auto"
            value={weaponFilter}
            onChange={e => setWeaponFilter(e.target.value)}
            aria-label="Filter by weapon"
          >
            <option value="all">All weapons</option>
            {weaponOptions.map(w => <option key={w} value={w}>{w}</option>)}
          </select>

          <div className="flex items-center gap-1 ml-auto">
            <Filter className="w-3.5 h-3.5 text-arc-dim" />
            {(['all', 'learned', 'not-learned'] as const).map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors
                  ${statusFilter === s
                    ? s === 'learned'
                      ? 'bg-arc-learned/15 text-arc-learned border-arc-learned/30'
                      : s === 'not-learned'
                        ? 'bg-arc-danger/10 text-arc-danger border-arc-danger/30'
                        : 'bg-arc-accent/15 text-arc-accent border-arc-accent/30'
                    : 'border-arc-border text-arc-muted hover:border-arc-muted/60'}`}
              >
                {s === 'all' ? 'All' : s === 'learned' ? '✓ Learned' : '○ Not learned'}
              </button>
            ))}

            {hasFilters && (
              <button
                onClick={() => { setSearch(''); setRarityFilter('all'); setWeaponFilter('all'); setStatusFilter('all'); }}
                className="btn-ghost text-xs gap-1 py-1.5"
              >
                <RotateCcw className="w-3 h-3" /> Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-auto p-6">
        {filtered.length === 0 ? (
          <div className="text-center py-16"><p className="text-arc-dim">No stencils match your filters.</p></div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-arc-dim">{filtered.length} stencil{filtered.length !== 1 ? 's' : ''}</p>
              <QuickLearnAll stencils={filtered} trackingMap={trackingMap} onBulkLearn={() => {
                filtered.filter(s => !trackingMap[s.id]?.learned).forEach(s => handleToggleLearned(s.id, true));
              }} onBulkUnlearn={() => {
                filtered.filter(s => trackingMap[s.id]?.learned === 1).forEach(s => handleToggleLearned(s.id, false));
              }} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {filtered.map(s => (
                <StencilCard key={s.id} stencil={s} trackingMap={trackingMap}
                  onToggleLearned={handleToggleLearned} onSetExtras={handleSetExtras} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function QuickLearnAll({ stencils, trackingMap, onBulkLearn, onBulkUnlearn }: {
  stencils: Stencil[]; trackingMap: StencilTrackingMap; onBulkLearn: () => void; onBulkUnlearn: () => void;
}) {
  const unlearnedCount = stencils.filter(s => !trackingMap[s.id]?.learned).length;
  const learnedCount   = stencils.filter(s => trackingMap[s.id]?.learned === 1).length;
  return (
    <div className="flex gap-2">
      {unlearnedCount > 0 && (
        <button onClick={onBulkLearn} className="btn-ghost text-xs gap-1 py-1">
          <CheckSquare className="w-3 h-3 text-arc-learned" /> Learn all ({unlearnedCount})
        </button>
      )}
      {learnedCount > 0 && (
        <button onClick={onBulkUnlearn} className="btn-ghost text-xs gap-1 py-1">
          <Square className="w-3 h-3" /> Unlearn all ({learnedCount})
        </button>
      )}
    </div>
  );
}
