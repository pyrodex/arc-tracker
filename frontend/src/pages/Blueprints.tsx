import { useState, useMemo, useCallback } from 'react';
import { Search, Filter, CheckSquare, Square, RotateCcw } from 'lucide-react';
import type { Blueprint, BlueprintCategory, Character, TrackingMap } from '../types';
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

  const [selectedCharId, setSelectedCharId] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<BlueprintCategory | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [search, setSearch] = useState('');

  const activeCharId = selectedCharId ?? characters[0]?.id ?? null;
  const activeChar: Character | undefined = characters.find(c => c.id === activeCharId);

  const { data: blueprints = [] } = useBlueprints(selectedCategory === 'all' ? undefined : selectedCategory);
  const { trackingMap } = useTrackingMap(activeCharId);
  const upsert = useUpsertTracking();

  const filtered = useMemo(() => {
    let list = blueprints;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(bp => bp.name.toLowerCase().includes(q));
    }
    if (statusFilter === 'learned') {
      list = list.filter(bp => trackingMap[bp.id]?.learned === 1);
    } else if (statusFilter === 'not-learned') {
      list = list.filter(bp => !trackingMap[bp.id]?.learned);
    }
    return list;
  }, [blueprints, search, statusFilter, trackingMap]);

  const handleToggleLearned = useCallback((blueprintId: number, learned: boolean) => {
    if (!activeCharId) return;
    const current = trackingMap[blueprintId];
    upsert.mutate({
      character_id: activeCharId,
      blueprint_id: blueprintId,
      learned,
      extras: current?.extras ?? 0,
    });
  }, [activeCharId, trackingMap, upsert]);

  const handleSetExtras = useCallback((blueprintId: number, extras: number) => {
    if (!activeCharId) return;
    const current = trackingMap[blueprintId];
    upsert.mutate({
      character_id: activeCharId,
      blueprint_id: blueprintId,
      learned: current?.learned === 1,
      extras,
    });
  }, [activeCharId, trackingMap, upsert]);

  const learnedCount = blueprints.filter(bp => trackingMap[bp.id]?.learned === 1).length;
  const totalCount = blueprints.length;

  if (characters.length === 0) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-400 mb-3">No characters yet. Create a character first.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-arc-border bg-arc-panel/50">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-white">Blueprints</h1>
          <div className="text-sm text-slate-400">
            {activeChar && (
              <span>
                <span className="text-white font-medium">{learnedCount}</span> / {totalCount} learned
              </span>
            )}
          </div>
        </div>

        {/* Character selector */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <span className="text-xs text-slate-500 uppercase tracking-wide shrink-0">Character:</span>
          <div className="flex flex-wrap gap-2">
            {characters.map(char => (
              <button
                key={char.id}
                onClick={() => setSelectedCharId(char.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors
                  ${activeCharId === char.id
                    ? 'text-white border-opacity-60'
                    : 'border-arc-border text-slate-400 hover:text-slate-200 hover:border-slate-500'
                  }`}
                style={activeCharId === char.id ? {
                  backgroundColor: char.color + '20',
                  borderColor: char.color + '60',
                  color: char.color,
                } : {}}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: activeCharId === char.id ? char.color : '#475569' }}
                />
                {char.name}
                {char.label && <span className="text-xs opacity-70">· {char.label}</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 items-center">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <input
              className="input pl-8 py-1.5 text-sm w-48"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search blueprints…"
            />
          </div>

          {/* Category filter */}
          <div className="flex items-center gap-1 flex-wrap">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors
                ${selectedCategory === 'all'
                  ? 'bg-arc-accent/15 text-arc-accent border-arc-accent/30'
                  : 'border-arc-border text-slate-400 hover:border-slate-500 hover:text-slate-200'
                }`}
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
                      : 'border-arc-border text-slate-400 hover:border-slate-500 hover:text-slate-200'
                    }`}
                >
                  {meta.emoji} {cat.category} ({cat.count})
                </button>
              );
            })}
          </div>

          {/* Status filter */}
          <div className="flex items-center gap-1 ml-auto">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
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
                    : 'border-arc-border text-slate-400 hover:border-slate-500'
                  }`}
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

      {/* Blueprint grid */}
      <div className="flex-1 overflow-auto p-6">
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-slate-500">No blueprints match your filters.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-slate-500">{filtered.length} blueprint{filtered.length !== 1 ? 's' : ''}</p>
              {activeChar && (
                <QuickLearnAll
                  blueprints={filtered}
                  trackingMap={trackingMap}
                  onBulkLearn={() => {
                    const unlearned = filtered.filter(bp => !trackingMap[bp.id]?.learned);
                    unlearned.forEach(bp => handleToggleLearned(bp.id, true));
                  }}
                  onBulkUnlearn={() => {
                    const learned = filtered.filter(bp => trackingMap[bp.id]?.learned === 1);
                    learned.forEach(bp => handleToggleLearned(bp.id, false));
                  }}
                />
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {filtered.map(bp => (
                <BlueprintCard
                  key={bp.id}
                  blueprint={bp}
                  character={activeChar!}
                  trackingMap={trackingMap}
                  onToggleLearned={handleToggleLearned}
                  onSetExtras={handleSetExtras}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function QuickLearnAll({ blueprints, trackingMap, onBulkLearn, onBulkUnlearn }: {
  blueprints: Blueprint[];
  trackingMap: TrackingMap;
  onBulkLearn: () => void;
  onBulkUnlearn: () => void;
}) {
  const unlearnedCount = blueprints.filter(bp => !trackingMap[bp.id]?.learned).length;
  const learnedCount = blueprints.filter(bp => trackingMap[bp.id]?.learned === 1).length;

  return (
    <div className="flex gap-2">
      {unlearnedCount > 0 && (
        <button onClick={onBulkLearn} className="btn-ghost text-xs gap-1 py-1">
          <CheckSquare className="w-3 h-3 text-arc-learned" />
          Learn all ({unlearnedCount})
        </button>
      )}
      {learnedCount > 0 && (
        <button onClick={onBulkUnlearn} className="btn-ghost text-xs gap-1 py-1">
          <Square className="w-3 h-3" />
          Unlearn all ({learnedCount})
        </button>
      )}
    </div>
  );
}
