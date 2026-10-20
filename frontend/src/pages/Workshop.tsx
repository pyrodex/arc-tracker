import { useMemo, useState, useCallback } from 'react';
import { Search, RotateCcw, Wrench, Shield, HeartPulse, Bomb, Zap, Recycle, FlaskConical, type LucideIcon } from 'lucide-react';
import type { WorkshopRequirement } from '../types';
import { useWorkshopRequirements } from '../hooks/useWorkshopRequirements';
import {
  useWorkshopStations,
  useWorkshopProgressMap,
  useUpsertWorkshopProgress,
  useUpsertWorkshopMaterialTracking,
  useUpsertArcPartTracking,
  useCharacterActivity,
} from '../hooks/useApi';
import LastUpdated from '../components/LastUpdated';
import CharacterSwitcher from '../components/CharacterSwitcher';
import { useActiveCharacter } from '../hooks/useActiveCharacter';
import WorkshopStationCard from '../components/WorkshopStationCard';

const STATION_ICONS: Record<string, LucideIcon> = {
  gunsmith: Wrench,
  'gear-bench': Shield,
  'medical-lab': HeartPulse,
  'explosives-station': Bomb,
  'utility-station': Zap,
  refiner: Recycle,
  'research-station': FlaskConical,
};

export default function Workshop() {
  const { characters, activeCharId, activeChar } = useActiveCharacter();
  const { data: stations = [], isLoading: stationsLoading } = useWorkshopStations();

  const [search, setSearch] = useState('');

  const activity = useCharacterActivity(activeCharId);

  const { progressMap } = useWorkshopProgressMap(activeCharId);
  const upsertProgress = useUpsertWorkshopProgress();

  const upsertMaterial = useUpsertWorkshopMaterialTracking();
  const upsertArcPart = useUpsertArcPartTracking();
  const getRequirementData = useWorkshopRequirements(activeCharId);

  const handleSetCount = useCallback((req: WorkshopRequirement, count: number) => {
    if (!activeCharId) return;
    if (req.item_type === 'arc_part') {
      upsertArcPart.mutate({ character_id: activeCharId, part_id: req.item_id, count });
    } else {
      upsertMaterial.mutate({ character_id: activeCharId, material_id: req.item_id, count });
    }
  }, [activeCharId, upsertArcPart, upsertMaterial]);

  const handleSetLevel = useCallback((stationId: number, level: number) => {
    if (!activeCharId) return;
    upsertProgress.mutate({ character_id: activeCharId, station_id: stationId, level });
  }, [activeCharId, upsertProgress]);

  const filteredStations = useMemo(() => {
    if (!search.trim()) return stations;
    const q = search.toLowerCase();
    return stations
      .map(station => {
        if (station.name.toLowerCase().includes(q)) return station;
        const levels = station.levels
          .map(lvl => ({ ...lvl, requirements: lvl.requirements.filter(r => r.name.toLowerCase().includes(q)) }))
          .filter(lvl => lvl.requirements.length > 0);
        return levels.length > 0 ? { ...station, levels } : null;
      })
      .filter((s): s is typeof stations[number] => s !== null);
  }, [stations, search]);

  const maxedCount = stations.filter(s => {
    const maxLevel = s.levels.length > 0 ? Math.max(...s.levels.map(l => l.level)) : 3;
    return (progressMap[s.id] ?? 0) >= maxLevel;
  }).length;

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
            <h1 className="text-2xl font-bold text-arc-text">Workshop</h1>
            <p className="text-xs text-arc-dim mt-0.5">Station upgrade requirements &amp; material stockpiles per character</p>
          </div>
          {stations.length > 0 && (
            <div className="text-right">
              <p className="text-sm text-arc-muted">
                <span className="text-arc-text font-medium">{maxedCount}</span> / {stations.length} stations maxed
              </p>
              {activeChar && (
                <p className="text-xs text-arc-dim mt-0.5">
                  editing counts for <span className="font-semibold" style={{ color: activeChar.color }}>{activeChar.name}</span>
                </p>
              )}
            </div>
          )}
        </div>

        {/* Character (shared across pages) */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <CharacterSwitcher />

          {/* When this character last touched this area. */}
          <LastUpdated value={activity?.workshop ?? null} label="Updated" className="ml-auto" />
        </div>

        {/* Search */}
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-arc-dim" />
            <input
              className="input pl-8 py-1.5 text-sm w-full sm:w-56"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search stations or materials…"
            />
          </div>
          {search && (
            <button
              onClick={() => setSearch('')}
              className="btn-ghost text-xs gap-1 py-1.5"
            >
              <RotateCcw className="w-3 h-3" /> Reset
            </button>
          )}
        </div>
      </div>

      {/* Stations */}
      <div className="md:flex-1 md:overflow-auto p-4 sm:p-6">
        {stationsLoading ? (
          <div className="text-center py-16">
            <div className="inline-block w-6 h-6 border-2 border-arc-accent/30 border-t-arc-accent rounded-full animate-spin mb-3" />
            <p className="text-arc-muted text-sm">Loading workshop data…</p>
          </div>
        ) : filteredStations.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-arc-dim">No stations or materials match your search.</p>
          </div>
        ) : (
          <div className="space-y-4 max-w-4xl mx-auto">
            {filteredStations.map(station => (
              <WorkshopStationCard
                key={station.id}
                station={station}
                icon={STATION_ICONS[station.slug] ?? Wrench}
                currentLevel={progressMap[station.id] ?? 0}
                getRequirementData={getRequirementData}
                onSetLevel={handleSetLevel}
                onSetCount={handleSetCount}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
