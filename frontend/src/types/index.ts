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

// ── Workshop ───────────────────────────────────────────────────────────────────

export type WorkshopItemType = 'material' | 'arc_part';

export interface WorkshopRequirement {
  item_type: WorkshopItemType;
  item_id: number;
  name: string;
  slug: string;
  rarity: ArcPartRarity | null;
  source: string | null;
  qty_required: number;
}

export interface WorkshopLevel {
  level: number;
  requirements: WorkshopRequirement[];
}

export interface WorkshopStation {
  id: number;
  name: string;
  slug: string;
  sort_order: number;
  levels: WorkshopLevel[];
}

export interface WorkshopStationProgress {
  station_id: number;
  level: number;
}

export interface WorkshopStationProgressMap {
  [stationId: number]: number;
}

export type WorkshopProgressUpdate = {
  character_id: number;
  station_id: number;
  level: number;
};

export interface WorkshopMaterialTrackingRecord {
  id: number;
  character_id: number;
  material_id: number;
  count: number;
  updated_at: string;
  material_name?: string;
  slug?: string;
}

export interface WorkshopMaterialTrackingMap {
  [materialId: number]: WorkshopMaterialTrackingRecord;
}

export type WorkshopMaterialCountUpdate = {
  character_id: number;
  material_id: number;
  count: number;
};

export interface WorkshopCharacterCount {
  character_id: number;
  character_name: string;
  character_label: string | null;
  character_color: string;
  count: number;
}

export interface WorkshopMaterialsReport {
  material_id: number;
  material_name: string;
  slug: string;
  total_count: number;
  character_breakdown: WorkshopCharacterCount[];
}

// ── Gun configurations ─────────────────────────────────────────────────────────

export type ModSlot = 'muzzle' | 'underbarrel' | 'stock' | 'magazine' | 'tech';

/** Narrows a slot to a weapon family — shotgun muzzles, magazine sizes. */
export type ModVariant = 'shotgun' | 'light' | 'medium';

export interface ModSlotMeta {
  slot: ModSlot;
  label: string;
  sort_order: number;
}

export interface WeaponMod {
  id: number;
  name: string;
  slug: string;
  slot: ModSlot;
  variant: ModVariant | null;
  craftable: 0 | 1;
  /** null for loot-only mods and for tier I mods that have no seeded blueprint. */
  blueprint_id: number | null;
  blueprint_slug: string | null;
  sell_value: number;
  sort_order: number;
}

export interface WeaponModCatalog {
  slots: ModSlotMeta[];
  mods: WeaponMod[];
}

/** A mod as it appears attached to a config (catalog fields, no join noise). */
export interface ConfigMod {
  id: number;
  name: string;
  slug: string;
  slot: ModSlot;
  variant: ModVariant | null;
  craftable: 0 | 1;
  sell_value: number;
}

export interface GunConfig {
  id: number;
  character_id: number;
  blueprint_id: number;
  name: string | null;
  tier: number | null;
  quantity: number;
  weapon_value: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  weapon_name: string;
  weapon_slug: string;
  mods: ConfigMod[];
  /** Derived server-side: sum of attached mod prices. */
  mods_value: number;
  /** Derived server-side: weapon_value + mods_value. */
  unit_value: number;
  /** Derived server-side: unit_value × quantity. */
  total_value: number;
  /** Seeded wiki price for this weapon at this tier; null when unknown. */
  catalog_weapon_value: number | null;
}

/** Seeded weapon sale prices: blueprint id → tier → value. Tier 0 = untiered. */
export interface WeaponPriceCatalog {
  prices: Record<number, Record<number, number>>;
  rows: Array<{
    blueprint_id: number;
    tier: number;
    sell_value: number;
    weapon_name: string;
  }>;
}

export type CreateGunConfigPayload = {
  character_id: number;
  blueprint_id: number;
  name?: string | null;
  tier?: number | null;
  quantity?: number;
  weapon_value?: number;
  notes?: string | null;
  mod_ids?: number[];
};

/** Omitting mod_ids leaves the attached mods untouched; [] strips them. */
export type UpdateGunConfigPayload = Partial<Omit<CreateGunConfigPayload, 'character_id'>>;

export interface GunConfigCharacterReport {
  character_id: number;
  character_name: string;
  character_label: string | null;
  character_color: string;
  config_count: number;
  total_guns: number;
  total_value: number;
  configs: GunConfig[];
}

export interface GunConfigWeaponReport {
  blueprint_id: number;
  weapon_name: string;
  weapon_slug: string;
  config_count: number;
  total_guns: number;
}

export interface GunConfigsReport {
  characters: GunConfigCharacterReport[];
  weapons: GunConfigWeaponReport[];
  totals: {
    config_count: number;
    total_guns: number;
    total_value: number;
  };
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
