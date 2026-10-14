import type { Character } from '../types';

export type StashField = 'normal_stash' | 'nomad_stash' | 'expedition_stash';

export interface StashSource {
  field: StashField;
  label: string;
  /** Slots added per step. */
  slotsEach: number;
  /** Maximum number of steps. Keep in sync with STASH_LIMITS in backend/src/server.js. */
  max: number;
}

/** Slots every character starts with. */
export const BASE_STASH_SLOTS = 64;

export const STASH_SOURCES: StashSource[] = [
  { field: 'normal_stash', label: 'Upgrades', slotsEach: 24, max: 11 },
  { field: 'nomad_stash', label: 'Nomad', slotsEach: 12, max: 2 },
  { field: 'expedition_stash', label: 'Expeditions', slotsEach: 12, max: 3 },
];

/** A character's count for one source, clamped to that source's range. */
export function stashCount(char: Character, source: StashSource): number {
  const value = char[source.field] ?? 0;
  return Math.min(Math.max(0, value), source.max);
}

/** Total stash slots for a character: base plus every expansion. */
export function totalStashSlots(char: Character): number {
  return STASH_SOURCES.reduce(
    (total, source) => total + stashCount(char, source) * source.slotsEach,
    BASE_STASH_SLOTS,
  );
}

/** Total slots with every expansion maxed out. */
export const MAX_STASH_SLOTS = STASH_SOURCES.reduce(
  (total, source) => total + source.max * source.slotsEach,
  BASE_STASH_SLOTS,
);
