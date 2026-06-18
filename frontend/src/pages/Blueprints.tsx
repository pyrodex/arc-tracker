import { useState, useMemo, useCallback } from 'react';
import { Search, Filter, CheckSquare, Square, RotateCcw } from 'lucide-react';
import type { Blueprint, BlueprintCategory, TrackingMap } from '../types';
import {
  useBlueprints,
  useBlueprintCategories,
  useCharacters,
  useTrackingMap,
  useUpsertTracking,
} from '../hooks/useApi';
import BlueprintCard from '../components/BlueprintCard';
import { categoryMeta } from '../components/CategoryIcon';

type FilterStatus = 'all' | 'learned' | 'not-learned';

export default function Blueprints() {
  const { data: characters = [] } = useCharacters();
  const { data: categories = [] } = useBlueprintCategories();

  const [selectedCharId, setSelectedCharId]     = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<BlueprintCategory | 'all'>('all');
  const [statusFilter, setStatusFilter]         = useState<FilterStatus>('all');
  const [search, setSearch]                     = useState('');

  const activeCharId = selectedCharId ?? characters[0]?.id ?? null;
  const activeChar   = characters.find(c => c.id === activeCharId);

  const { data: blueprints = [] } = useBlueprints(selectedCategory === 'all' ? undefined : selectedCategory);
  const { trackingMap }           = useTrackingMap(activeCharId);
  const upsert                    = useUpsertTracking();

  const filtered = useMemo(() => {
    let list = blueprints;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(bp => bp.name.toLowerCase().includes(q));
    }
    if (statusFilter === 'learned')     list = list.filter(bp => trackingMap[bp.id]?.learned === 1);
    if (statusFilter === 'not-learned') list = list.filter(bp => !trackingMap[bp.id]?.learned);
    return list;
  }, [blueprints, search, statusFilter, trackingMap]);

  const handleToggleLearned = useCallback((blueprintId: number, learned: boolean) => {
    if (!activeCharId) return;
    upsert.mutate({ character_id: activeCharId, blueprint_id: blueprintId, learned, extras: trackingMap[blueprintId]?.extras ?? 0 });
  }, [activeCharId, trackingMap, upsert]);

  const handleSetExtras = useCallback((blueprintId: number, extras: number) => {
    if (!activeCharId) return;
    upsert.mutate({ character_id: activeCharId, blueprint_id: blueprintId, learned: trackingMap[blueprintId]?.learned === 1, extras });
  }, [activeCharId, trackingMap, upsert]);

  const learnedCount = blueprints.filter(bp => trackingMap[bp.id]?.learned === 1).length;

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
          <h1 className="text-2xl font-bold text-arc-text">Blueprints</h1>
          {activeChar && (
            <span className="text-sm text-arc-muted">
              <span className="text-arc-text font-medium">{learnedCount}</span> / {blueprints.length} learned
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
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-arc-dim" />
            <input
              className="input pl-8 py-1.5 text-sm w-48"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search blueprints…"
            />
          </div>

          <div className="flex items-center gap-1 flex-wrap">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors
                ${selectedCategory === 'all'
                  ? 'bg-arc-accent/15 text-arc-accent border-arc-accent/30'
                  : 'border-arc-border text-arc-muted hover:border-arc-muted/60 hover:text-arc-text'}`}
            >
              All ({categories.reduce((s, c) => s + c.count, 0)})
            </button>
            {categories.map(cat => {
              const meta = categoryMeta(cat.category as BlueprintCategory);
              return (
                <button
                  key={cat.category}
                  onClick={() => setSelectedCategory(cat.category as BlueprintCategory)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors
                    ${selectedCategory === cat.category
                      ? `${meta.bg} ${meta.text} ${meta.border}`
                      : 'border-arc-border text-arc-muted hover:border-arc-muted/60 hover:text-arc-text'}`}
                >
                  {meta.emoji} {cat.category} ({cat.count})
                </button>
              );
            })}
          </div>

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

            {(search || selectedCategory !== 'all' || statusFilter !== 'all') && (
              <button
                onClick={() => { setSearch(''); setSelectedCategory('all'); setStatusFilter('all'); }}
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
          <div className="text-center py-16"><p className="text-arc-dim">No blueprints match your filters.</p></div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-arc-dim">{filtered.length} blueprint{filtered.length !== 1 ? 's' : ''}</p>
              <QuickLearnAll blueprints={filtered} trackingMap={trackingMap} onBulkLearn={() => {
                filtered.filter(bp => !trackingMap[bp.id]?.learned).forEach(bp => handleToggleLearned(bp.id, true));
              }} onBulkUnlearn={() => {
                filtered.filter(bp => trackingMap[bp.id]?.learned === 1).forEach(bp => handleToggleLearned(bp.id, false));
              }} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {filtered.map(bp => (
                <BlueprintCard key={bp.id} blueprint={bp} trackingMap={trackingMap}
                  onToggleLearned={handleToggleLearned} onSetExtras={handleSetExtras} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function QuickLearnAll({ blueprints, trackingMap, onBulkLearn, onBulkUnlearn }: {
  blueprints: Blueprint[]; trackingMap: TrackingMap; onBulkLearn: () => void; onBulkUnlearn: () => void;
}) {
  const unlearnedCount = blueprints.filter(bp => !trackingMap[bp.id]?.learned).length;
  const learnedCount   = blueprints.filter(bp => trackingMap[bp.id]?.learned === 1).length;
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
