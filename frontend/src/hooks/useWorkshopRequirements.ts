import { useCallback, useMemo } from 'react';
import type { WorkshopCharacterCount, WorkshopRequirement } from '../types';
import {
  useWorkshopMaterialsTrackingMap,
  useWorkshopMaterialsReport,
  useArcPartsTrackingMap,
  useArcPartsReport,
} from './useApi';

export interface RequirementData {
  /** Held across all characters. */
  totalCount: number;
  breakdown: WorkshopCharacterCount[];
  /** Held by the given character. */
  activeCount: number;
}

/**
 * Counts behind each workshop requirement for one character, plus the
 * all-character totals. Requirements can be workshop materials or ARC parts
 * (e.g. Bully Fragmenter), which live in different tables.
 */
export function useWorkshopRequirements(characterId: number | null) {
  const { trackingMap: materialTrackingMap } = useWorkshopMaterialsTrackingMap(characterId);
  const { trackingMap: arcPartTrackingMap } = useArcPartsTrackingMap(characterId);
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

  return useCallback((req: WorkshopRequirement): RequirementData => {
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
}
