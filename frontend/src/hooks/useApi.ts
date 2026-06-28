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
    },
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
