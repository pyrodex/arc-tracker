import { useMemo, useState, useCallback } from 'react';
import { Search, RotateCcw, Wrench, Shield, HeartPulse, Bomb, Zap, Recycle, type LucideIcon } from 'lucide-react';
import type { WorkshopCharacterCount, WorkshopRequirement } from '../types';
import {
  useCharacters,
  useWorkshopStations,
  useWorkshopProgressMap,
  useUpsertWorkshopProgress,
  useWorkshopMaterialsTrackingMap,
  useUpsertWorkshopMaterialTracking,
  useWorkshopMaterialsReport,
  useArcPartsTrackingMap,
  useUpsertArcPartTracking,
  useArcPartsReport,
} from '../hooks/useApi';
import WorkshopStationCard from '../components/WorkshopStationCard';

const STATION_ICONS: Record<string, LucideIcon> = {
  gunsmith: Wrench,
  'gear-bench': Shield,
  'medical-lab': HeartPulse,
  'explosives-station': Bomb,
  'utility-station': Zap,
  refiner: Recycle,
};

export default function Workshop() {
  const { data: characters = [] } = useCharacters();
  const { data: stations = [], isLoading: stationsLoading } = useWorkshopStations();

  const [selectedCharId, setSelectedCharId] = useState<number | null>(null);
  const [search, setSearch] = useState('');

  const activeCharId = selectedCharId ?? characters[0]?.id ?? null;
  const activeChar = characters.find(c => c.id === activeCharId);

  const { progressMap } = useWorkshopProgressMap(activeCharId);
  const upsertProgress = useUpsertWorkshopProgress();

  const { trackingMap: materialTrackingMap } = useWorkshopMaterialsTrackingMap(activeCharId);
  const upsertMaterial = useUpsertWorkshopMaterialTracking();

  const { trackingMap: arcPartTrackingMap } = useArcPartsTrackingMap(activeCharId);
  const upsertArcPart = useUpsertArcPartTracking();

  const { data: materialsReport = [] } = useWorkshopMaterialsReport();
  const { data: arcPartsReport = [] } = useArcPartsReport();

  const materialReportById = useMemo(
    () => Object.fromEntries(materialsReport.map(r => [r.material_id, r])),
    [materialsReport],
  );
  const arcPartReportById = useMemo(
    () => Object.fromEntries(arcPartsReport.map(r => [r.part_id, r])),
    [arcPartsReport],
  );

  const getRequirementData = useCallback((req: WorkshopRequirement) => {
    if (req.item_type === 'arc_part') {
      const report = arcPartReportById[req.item_id];
      return {
        totalCount: report?.total_count ?? 0,
        breakdown: (report?.character_breakdown ?? []).map((cb): WorkshopCharacterCount => ({
          character_id: cb.character_id,
          character_name: cb.character_name,
          character_label: cb.character_label,
          character_color: cb.character_color,
          count: cb.count,
        })),
        activeCount: arcPartTrackingMap[req.item_id]?.count ?? 0,
      };
    }
    const report = materialReportById[req.item_id];
    return {
      totalCount: report?.total_count ?? 0,
      breakdown: report?.character_breakdown ?? [],
      activeCount: materialTrackingMap[req.item_id]?.count ?? 0,
    };
  }, [arcPartReportById, materialReportById, arcPartTrackingMap, materialTrackingMap]);

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
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-arc-border bg-arc-panel/50 shrink-0">
        <div className="flex items-center justify-between mb-4">
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
        </div>

        {/* Search */}
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-arc-dim" />
            <input
              className="input pl-8 py-1.5 text-sm w-56"
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
      <div className="flex-1 overflow-auto p-6">
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
