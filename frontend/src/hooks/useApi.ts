import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  Blueprint,
  CategoryCount,
  Character,
  TrackingRecord,
  TrackingMap,
  Summary,
  UnlearnedBlueprint,
  ExtrasReport,
  CreateCharacterPayload,
  UpdateCharacterPayload,
  TrackingUpdate,
  ArcPart,
  ArcPartTrackingRecord,
  ArcPartTrackingMap,
  ArcPartCountUpdate,
  ArcPartsReport,
  WorkshopStation,
  WorkshopStationProgress,
  WorkshopStationProgressMap,
  WorkshopProgressUpdate,
  WorkshopMaterialTrackingRecord,
  WorkshopMaterialTrackingMap,
  WorkshopMaterialCountUpdate,
  WorkshopMaterialsReport,
  WeaponMod,
  WeaponModCatalog,
  GunConfig,
  GunConfigsReport,
  CreateGunConfigPayload,
  UpdateGunConfigPayload,
  WeaponPriceCatalog,
  WeaponCatalog,
} from '../types';

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as unknown as T;
  return res.json();
}

// ── Blueprints ─────────────────────────────────────────────────────────────────
export function useBlueprints(category?: string) {
  const params = new URLSearchParams({ in_game: 'true' });
  if (category && category !== 'all') params.set('category', category);
  return useQuery<Blueprint[]>({
    queryKey: ['blueprints', category ?? 'all'],
    queryFn: () => apiFetch(`/api/blueprints?${params}`),
    staleTime: Infinity,
  });
}

export function useBlueprintCategories() {
  return useQuery<CategoryCount[]>({
    queryKey: ['blueprint-categories'],
    queryFn: () => apiFetch('/api/blueprints/categories'),
    staleTime: Infinity,
  });
}

// ── Characters ─────────────────────────────────────────────────────────────────
export function useCharacters() {
  return useQuery<Character[]>({
    queryKey: ['characters'],
    queryFn: () => apiFetch('/api/characters'),
    staleTime: 30_000,
  });
}

export function useCreateCharacter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateCharacterPayload) =>
      apiFetch<Character>('/api/characters', { method: 'POST', body: JSON.stringify(payload) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['characters'] }),
  });
}

export function useUpdateCharacter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: number } & UpdateCharacterPayload) =>
      apiFetch<Character>(`/api/characters/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['characters'] }),
  });
}

export function useDeleteCharacter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiFetch<void>(`/api/characters/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['characters'] });
      qc.invalidateQueries({ queryKey: ['tracking'] });
      qc.invalidateQueries({ queryKey: ['reports'] });
    },
  });
}

// ── Tracking ───────────────────────────────────────────────────────────────────
export function useTracking(characterId: number | null) {
  return useQuery<TrackingRecord[]>({
    queryKey: ['tracking', characterId],
    queryFn: () => apiFetch(`/api/tracking/${characterId}`),
    enabled: characterId !== null,
    staleTime: 10_000,
    select: (data) => data,
  });
}

export function useTrackingMap(characterId: number | null) {
  const query = useTracking(characterId);
  const map: TrackingMap = {};
  if (query.data) {
    for (const record of query.data) {
      map[record.blueprint_id] = record;
    }
  }
  return { ...query, trackingMap: map };
}

export function useUpsertTracking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (update: TrackingUpdate) =>
      apiFetch<TrackingRecord>('/api/tracking', { method: 'POST', body: JSON.stringify(update) }),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['tracking', variables.character_id] });
      qc.invalidateQueries({ queryKey: ['reports'] });
    },
  });
}

export function useBatchUpdateTracking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (updates: TrackingUpdate[]) =>
      apiFetch<{ updated: number }>('/api/tracking/batch', {
        method: 'POST',
        body: JSON.stringify({ updates }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tracking'] });
      qc.invalidateQueries({ queryKey: ['reports'] });
    },
  });
}

// ── ARC Parts ──────────────────────────────────────────────────────────────────
export function useArcParts(rarity?: string) {
  const params = new URLSearchParams();
  if (rarity && rarity !== 'all') params.set('rarity', rarity);
  const search = params.toString();
  return useQuery<ArcPart[]>({
    queryKey: ['arc-parts', rarity ?? 'all'],
    queryFn: () => apiFetch(`/api/arc-parts${search ? `?${search}` : ''}`),
    staleTime: Infinity,
  });
}

export function useArcPartsTracking(characterId: number | null) {
  return useQuery<ArcPartTrackingRecord[]>({
    queryKey: ['arc-parts-tracking', characterId],
    queryFn: () => apiFetch(`/api/arc-parts/tracking/${characterId}`),
    enabled: characterId !== null,
    staleTime: 10_000,
  });
}

export function useArcPartsTrackingMap(characterId: number | null) {
  const query = useArcPartsTracking(characterId);
  const map: ArcPartTrackingMap = {};
  if (query.data) {
    for (const record of query.data) {
      map[record.part_id] = record;
    }
  }
  return { ...query, trackingMap: map };
}

export function useUpsertArcPartTracking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (update: ArcPartCountUpdate) =>
      apiFetch<ArcPartTrackingRecord>('/api/arc-parts/tracking', {
        method: 'POST',
        body: JSON.stringify(update),
      }),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['arc-parts-tracking', variables.character_id] });
      qc.invalidateQueries({ queryKey: ['reports', 'arc-parts'] });
    },
  });
}

// ── Workshop ───────────────────────────────────────────────────────────────────
export function useWorkshopStations() {
  return useQuery<WorkshopStation[]>({
    queryKey: ['workshop-stations'],
    queryFn: () => apiFetch('/api/workshop/stations'),
    staleTime: Infinity,
  });
}

export function useWorkshopProgress(characterId: number | null) {
  return useQuery<WorkshopStationProgress[]>({
    queryKey: ['workshop-progress', characterId],
    queryFn: () => apiFetch(`/api/workshop/progress/${characterId}`),
    enabled: characterId !== null,
    staleTime: 10_000,
  });
}

export function useWorkshopProgressMap(characterId: number | null) {
  const query = useWorkshopProgress(characterId);
  const map: WorkshopStationProgressMap = {};
  if (query.data) {
    for (const record of query.data) {
      map[record.station_id] = record.level;
    }
  }
  return { ...query, progressMap: map };
}

export function useUpsertWorkshopProgress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (update: WorkshopProgressUpdate) =>
      apiFetch<WorkshopStationProgress>('/api/workshop/progress', {
        method: 'POST',
        body: JSON.stringify(update),
      }),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['workshop-progress', variables.character_id] });
    },
  });
}

export function useWorkshopMaterialsTracking(characterId: number | null) {
  return useQuery<WorkshopMaterialTrackingRecord[]>({
    queryKey: ['workshop-materials-tracking', characterId],
    queryFn: () => apiFetch(`/api/workshop/materials/tracking/${characterId}`),
    enabled: characterId !== null,
    staleTime: 10_000,
  });
}

export function useWorkshopMaterialsTrackingMap(characterId: number | null) {
  const query = useWorkshopMaterialsTracking(characterId);
  const map: WorkshopMaterialTrackingMap = {};
  if (query.data) {
    for (const record of query.data) {
      map[record.material_id] = record;
    }
  }
  return { ...query, trackingMap: map };
}

export function useUpsertWorkshopMaterialTracking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (update: WorkshopMaterialCountUpdate) =>
      apiFetch<WorkshopMaterialTrackingRecord>('/api/workshop/materials/tracking', {
        method: 'POST',
        body: JSON.stringify(update),
      }),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['workshop-materials-tracking', variables.character_id] });
      qc.invalidateQueries({ queryKey: ['reports', 'workshop-materials'] });
    },
  });
}

export function useWorkshopMaterialsReport() {
  return useQuery<WorkshopMaterialsReport[]>({
    queryKey: ['reports', 'workshop-materials'],
    queryFn: () => apiFetch('/api/reports/workshop-materials'),
    staleTime: 15_000,
  });
}

// ── Gun configurations ─────────────────────────────────────────────────────────
export function useWeaponMods() {
  return useQuery<WeaponModCatalog>({
    queryKey: ['weapon-mods'],
    queryFn: () => apiFetch('/api/weapon-mods'),
    staleTime: 60_000,
  });
}

export function useUpdateModPrice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, sell_value }: { id: number; sell_value: number }) =>
      apiFetch<WeaponMod>(`/api/weapon-mods/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ sell_value }),
      }),
    // A mod price feeds every config's value, so refresh configs and reports too.
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['weapon-mods'] });
      qc.invalidateQueries({ queryKey: ['gun-configs'] });
      qc.invalidateQueries({ queryKey: ['reports', 'gun-configs'] });
    },
  });
}

// The weapon picker reads this rather than the blueprints table, because seven
// weapons are unlocked at the Gunsmith and have no blueprint.
export function useWeapons() {
  return useQuery<WeaponCatalog>({
    queryKey: ['weapons'],
    queryFn: () => apiFetch('/api/weapons'),
    staleTime: Infinity,
  });
}

export function useWeaponPrices() {
  return useQuery<WeaponPriceCatalog>({
    queryKey: ['weapon-prices'],
    queryFn: () => apiFetch('/api/weapon-prices'),
    staleTime: Infinity, // seeded reference data; never changes at runtime
  });
}

export function useGunConfigs(characterId: number | null) {
  return useQuery<GunConfig[]>({
    queryKey: ['gun-configs', characterId],
    queryFn: () => apiFetch(`/api/gun-configs/${characterId}`),
    enabled: characterId !== null,
    staleTime: 10_000,
  });
}

function invalidateConfigs(qc: ReturnType<typeof useQueryClient>, characterId?: number) {
  qc.invalidateQueries({ queryKey: ['gun-configs', characterId] });
  qc.invalidateQueries({ queryKey: ['reports', 'gun-configs'] });
}

export function useCreateGunConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateGunConfigPayload) =>
      apiFetch<GunConfig>('/api/gun-configs', { method: 'POST', body: JSON.stringify(payload) }),
    onSuccess: (_, variables) => invalidateConfigs(qc, variables.character_id),
  });
}

export function useUpdateGunConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: number } & UpdateGunConfigPayload) =>
      apiFetch<GunConfig>(`/api/gun-configs/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
    onSuccess: (config) => invalidateConfigs(qc, config.character_id),
  });
}

export function useSetGunConfigQuantity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, delta, quantity }: { id: number; delta?: number; quantity?: number }) =>
      apiFetch<GunConfig>(`/api/gun-configs/${id}/quantity`, {
        method: 'PATCH',
        body: JSON.stringify(delta !== undefined ? { delta } : { quantity }),
      }),
    onSuccess: (config) => invalidateConfigs(qc, config.character_id),
  });
}

export function useDeleteGunConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: number; characterId: number }) =>
      apiFetch<void>(`/api/gun-configs/${id}`, { method: 'DELETE' }),
    onSuccess: (_, variables) => invalidateConfigs(qc, variables.characterId),
  });
}

export function useGunConfigsReport() {
  return useQuery<GunConfigsReport>({
    queryKey: ['reports', 'gun-configs'],
    queryFn: () => apiFetch('/api/reports/gun-configs'),
    staleTime: 15_000,
  });
}

// ── Reports ────────────────────────────────────────────────────────────────────
export function useSummary() {
  return useQuery<Summary>({
    queryKey: ['reports', 'summary'],
    queryFn: () => apiFetch('/api/reports/summary'),
    staleTime: 15_000,
  });
}

export function useUnlearnedReport() {
  return useQuery<UnlearnedBlueprint[]>({
    queryKey: ['reports', 'unlearned'],
    queryFn: () => apiFetch('/api/reports/unlearned'),
    staleTime: 15_000,
  });
}

export function useExtrasReport() {
  return useQuery<ExtrasReport[]>({
    queryKey: ['reports', 'extras'],
    queryFn: () => apiFetch('/api/reports/extras'),
    staleTime: 15_000,
  });
}

export function useArcPartsReport() {
  return useQuery<ArcPartsReport[]>({
    queryKey: ['reports', 'arc-parts'],
    queryFn: () => apiFetch('/api/reports/arc-parts'),
    staleTime: 15_000,
  });
}
