export interface Blueprint {
  id: number;
  name: string;
  slug: string;
  category: BlueprintCategory;
  map: string;
  condition: string;
  containers: string | null;
  quest_reward: string | null;
  trials_reward: 0 | 1;
  in_game: 0 | 1;
  sort_order: number;
}

export type BlueprintCategory =
  | 'weapons'
  | 'mods'
  | 'explosives'
  | 'medicine'
  | 'augments'
  | 'utility'
  | 'crafting';

export interface CategoryCount {
  category: BlueprintCategory;
  count: number;
}

export interface Character {
  id: number;
  name: string;
  label: string | null;
  notes: string | null;
  color: string;
  sort_order: number;
  nomad_stash: number;
  parent_id: number | null;
  created_at: string;
}

export interface TrackingRecord {
  id: number;
  character_id: number;
  blueprint_id: number;
  learned: 0 | 1;
  extras: number;
  updated_at: string;
  blueprint_name?: string;
  slug?: string;
  category?: BlueprintCategory;
}

export interface TrackingMap {
  [blueprintId: number]: TrackingRecord;
}

export interface SummaryCharacter {
  id: number;
  name: string;
  label: string | null;
  color: string;
  learned_count: number;
  total_extras: number;
  total_blueprints: number;
  total_arc_parts: number;
  arc_parts_value: number;
}

export interface Summary {
  totalBlueprints: number;
  totalCharacters: number;
  characters: SummaryCharacter[];
}

export interface UnlearnedBlueprint extends Blueprint {
  characters: CharacterLearnStatus[];
  unlearned_count: number;
  unlearned_by_any: boolean;
}

export interface CharacterLearnStatus {
  character_id: number;
  character_name: string;
  character_label: string | null;
  character_color: string;
  learned: boolean;
}

export interface ExtrasReport {
  blueprint_id: number;
  blueprint_name: string;
  slug: string;
  category: BlueprintCategory;
  total_extras: number;
  character_breakdown: CharacterExtras[];
}

export interface CharacterExtras {
  character_id: number;
  character_name: string;
  character_label: string | null;
  character_color: string;
  extras: number;
}

// ── ARC Parts ──────────────────────────────────────────────────────────────────

export type ArcPartRarity = 'epic' | 'legendary';

export interface ArcPart {
  id: number;
  name: string;
  slug: string;
  rarity: ArcPartRarity;
  source: string;
  sell_value: number;
  sort_order: number;
}

export interface ArcPartTrackingRecord {
  id: number;
  character_id: number;
  part_id: number;
  count: number;
  updated_at: string;
  part_name?: string;
  slug?: string;
  rarity?: ArcPartRarity;
  source?: string;
}

export interface ArcPartTrackingMap {
  [partId: number]: ArcPartTrackingRecord;
}

export type ArcPartCountUpdate = {
  character_id: number;
  part_id: number;
  count: number;
};

export interface CharacterArcCount {
  character_id: number;
  character_name: string;
  character_label: string | null;
  character_color: string;
  count: number;
  value: number;
}

export interface ArcPartsReport {
  part_id: number;
  part_name: string;
  slug: string;
  rarity: ArcPartRarity;
  source: string;
  sell_value: number;
  total_count: number;
  total_value: number;
  character_breakdown: CharacterArcCount[];
}

// ── Characters ─────────────────────────────────────────────────────────────────

export type CreateCharacterPayload = {
  name: string;
  label?: string;
  notes?: string;
  color?: string;
  parent_id?: number | null;
};

export type UpdateCharacterPayload = Partial<CreateCharacterPayload & { sort_order: number; nomad_stash: number }>;

export type TrackingUpdate = {
  character_id: number;
  blueprint_id: number;
  learned: boolean;
  extras: number;
};
