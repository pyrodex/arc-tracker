import { useState, useMemo, useCallback } from 'react';
import { Search, RotateCcw } from 'lucide-react';
import type { ArcPartRarity, ArcPartTrackingMap } from '../types';
import {
  useArcParts,
  useArcPartsTrackingMap,
  useUpsertArcPartTracking,
  useCharacterActivity,
} from '../hooks/useApi';
import LastUpdated from '../components/LastUpdated';
import CharacterSwitcher from '../components/CharacterSwitcher';
import { useActiveCharacter } from '../hooks/useActiveCharacter';
import ArcPartCard from '../components/ArcPartCard';

type RarityFilter = 'all' | ArcPartRarity;

const rarityMeta: Record<ArcPartRarity, { label: string; icon: string; activeClass: string }> = {
  legendary: {
    label: 'Legendary',
    icon: '👑',
    activeClass: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  },
  epic: {
    label: 'Epic',
    icon: '⚡',
    activeClass: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  },
};

export default function ArcParts() {
  const { characters, activeCharId, activeChar } = useActiveCharacter();
  const { data: parts = [] }      = useArcParts();

  const [rarityFilter, setRarityFilter]     = useState<RarityFilter>('all');
  const [search, setSearch]                 = useState('');
  const [heldOnly, setHeldOnly]             = useState(false);

  const activity = useCharacterActivity(activeCharId);

  const { trackingMap } = useArcPartsTrackingMap(activeCharId);
  const upsert          = useUpsertArcPartTracking();

  const filtered = useMemo(() => {
    let list = parts;
    if (rarityFilter !== 'all') list = list.filter(p => p.rarity === rarityFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) || p.source.toLowerCase().includes(q),
      );
    }
    if (heldOnly) list = list.filter(p => (trackingMap[p.id]?.count ?? 0) > 0);
    return list;
  }, [parts, rarityFilter, search, heldOnly, trackingMap]);

  const handleSetCount = useCallback((partId: number, count: number) => {
    if (!activeCharId) return;
    upsert.mutate({ character_id: activeCharId, part_id: partId, count });
  }, [activeCharId, upsert]);

  const totalCollected = useMemo(
    () => parts.reduce((sum, p) => sum + (trackingMap[p.id]?.count ?? 0), 0),
    [parts, trackingMap],
  );

  const totalValue = useMemo(
    () => parts.reduce((sum, p) => sum + (trackingMap[p.id]?.count ?? 0) * p.sell_value, 0),
    [parts, trackingMap],
  );

  const legendaryCount = parts.filter(p => p.rarity === 'legendary').length;
  const epicCount      = parts.filter(p => p.rarity === 'epic').length;

  if (characters.length === 0) {
    return (
      <div className="p-8 text-center">
        <p className="text-arc-muted mb-3">No characters yet. Create a character first.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:h-full">
      {/* Header */}
      <div className="px-4 sm:px-6 pt-4 sm:pt-6 pb-4 border-b border-arc-border bg-arc-panel/50 shrink-0">
        <div className="flex items-start sm:items-center justify-between mb-4 gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-arc-text">ARC Parts</h1>
            <p className="text-xs text-arc-dim mt-0.5">Epic &amp; Legendary drops from elite ARC enemies</p>
          </div>
          {activeChar && totalCollected > 0 && (
            <div className="text-right">
              <p className="text-sm text-arc-muted">
                <span className="text-arc-text font-medium">{totalCollected}</span> collected
              </p>
              <p className="text-sm font-semibold text-arc-extra tabular-nums">
                {totalValue.toLocaleString()} total value
              </p>
            </div>
          )}
        </div>

        {/* Character (shared across pages) */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <CharacterSwitcher />

          {/* When this character last touched this area. */}
          <LastUpdated value={activity?.arc_parts ?? null} label="Updated" className="ml-auto" />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-arc-dim" />
            <input
              className="input pl-8 py-1.5 text-sm w-full sm:w-48"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search parts…"
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
              All ({parts.length})
            </button>

            <button
              onClick={() => setRarityFilter('legendary')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors
                ${rarityFilter === 'legendary'
                  ? rarityMeta.legendary.activeClass
                  : 'border-arc-border text-arc-muted hover:border-arc-muted/60 hover:text-arc-text'}`}
            >
              {rarityMeta.legendary.icon} Legendary ({legendaryCount})
            </button>

            <button
              onClick={() => setRarityFilter('epic')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors
                ${rarityFilter === 'epic'
                  ? rarityMeta.epic.activeClass
                  : 'border-arc-border text-arc-muted hover:border-arc-muted/60 hover:text-arc-text'}`}
            >
              {rarityMeta.epic.icon} Epic ({epicCount})
            </button>
          </div>

          <button
            onClick={() => setHeldOnly(h => !h)}
            aria-pressed={heldOnly}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors
              ${heldOnly
                ? 'bg-arc-extra/15 text-arc-extra border-arc-extra/30'
                : 'border-arc-border text-arc-muted hover:border-arc-muted/60 hover:text-arc-text'}`}
            title="Only show items this character holds"
          >
            Held only
          </button>

          {(search || rarityFilter !== 'all' || heldOnly) && (
            <button
              onClick={() => { setSearch(''); setRarityFilter('all'); setHeldOnly(false); }}
              className="btn-ghost text-xs gap-1 py-1.5 ml-auto"
            >
              <RotateCcw className="w-3 h-3" /> Reset
            </button>
          )}
        </div>
      </div>

      {/* Grid */}
      <div className="md:flex-1 md:overflow-auto p-4 sm:p-6">
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-arc-dim">No parts match your filters.</p>
          </div>
        ) : (
          <>
            {/* Legendary section */}
            {(rarityFilter === 'all' || rarityFilter === 'legendary') && (() => {
              const legendary = filtered.filter(p => p.rarity === 'legendary');
              if (!legendary.length) return null;
              return (
                <section className="mb-8">
                  <h2 className="text-sm font-semibold text-amber-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <span>👑</span> Legendary
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {legendary.map(p => (
                      <ArcPartCard
                        key={p.id}
                        part={p}
                        trackingMap={trackingMap as ArcPartTrackingMap}
                        onSetCount={handleSetCount}
                      />
                    ))}
                  </div>
                </section>
              );
            })()}

            {/* Epic section */}
            {(rarityFilter === 'all' || rarityFilter === 'epic') && (() => {
              const epic = filtered.filter(p => p.rarity === 'epic');
              if (!epic.length) return null;
              return (
                <section>
                  <h2 className="text-sm font-semibold text-purple-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <span>⚡</span> Epic
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {epic.map(p => (
                      <ArcPartCard
                        key={p.id}
                        part={p}
                        trackingMap={trackingMap as ArcPartTrackingMap}
                        onSetCount={handleSetCount}
                      />
                    ))}
                  </div>
                </section>
              );
            })()}
          </>
        )}
      </div>
    </div>
  );
}
