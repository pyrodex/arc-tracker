'use strict';

/**
 * Weapon Amplification components (Frozen Trail, patch 2.0).
 *
 * Amplifying a weapon to Level 5 consumes an Amplification Module matching the
 * weapon's base rarity; each amplification option then costs materials.
 * Tracked as per-character counts, like ARC parts. Amplifications that cost
 * ARC parts (Queen/Matriarch Reactor, Assessor Matrix, Turbine Compressor) use
 * the counts already kept on the ARC Parts page, so they aren't repeated here.
 *
 * Source: https://arcraiders.wiki/wiki/Amplified_Weapons and each item's page.
 *
 * kind:        'module' | 'material'
 * tier:        module Mk level 1–5 (null for materials)
 * unlocks:     weapon rarity a module amplifies (null for materials)
 * rarity:      item rarity where the wiki gives one, else null
 * sell_value:  coins per unit, or null where unknown
 * source:      where it drops, or null where unknown
 */
const MODULE_SOURCE = 'Fallen Emperor (Emperor Gateway Conduit, Pendola Pass), ARC Frigate cargo';

const AMPLIFICATION_COMPONENTS = [
  // ─── Amplification Modules ─────────────────────────────────────────────────
  { name: 'Amplification Module Mk. I',   kind: 'module', tier: 1, unlocks: 'common',    rarity: null, sell_value: 7000, source: MODULE_SOURCE },
  { name: 'Amplification Module Mk. II',  kind: 'module', tier: 2, unlocks: 'uncommon',  rarity: null, sell_value: 7000, source: MODULE_SOURCE },
  { name: 'Amplification Module Mk. III', kind: 'module', tier: 3, unlocks: 'rare',      rarity: null, sell_value: 7000, source: MODULE_SOURCE },
  { name: 'Amplification Module Mk. IV',  kind: 'module', tier: 4, unlocks: 'epic',      rarity: null, sell_value: 7000, source: MODULE_SOURCE },
  { name: 'Amplification Module Mk. V',   kind: 'module', tier: 5, unlocks: 'legendary', rarity: null, sell_value: 7000, source: MODULE_SOURCE },

  // ─── Amplification Materials ───────────────────────────────────────────────
  { name: 'Fluted Rotor Core',         kind: 'material', tier: null, unlocks: null, rarity: 'epic', sell_value: 5000, source: null },
  { name: 'Fossilized Lightning',      kind: 'material', tier: null, unlocks: null, rarity: 'epic', sell_value: 4000, source: 'Lightning strikes during Electromagnetic Storm' },
  { name: 'Pneumatic Actuator',        kind: 'material', tier: null, unlocks: null, rarity: 'epic', sell_value: 5000, source: 'ARC Frigate' },
  { name: 'Pressure Regulator',        kind: 'material', tier: null, unlocks: null, rarity: 'epic', sell_value: 5000, source: 'Harvester Payload' },
  // No wiki page yet: rarity, value and source unknown rather than guessed.
  { name: 'Propellant Valve Assembly', kind: 'material', tier: null, unlocks: null, rarity: null,   sell_value: null, source: null },
];

module.exports = AMPLIFICATION_COMPONENTS;
