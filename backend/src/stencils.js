'use strict';

/**
 * ARC Raiders weapon stencils (cosmetic weapon finishes, added Oct 2026).
 * Stencils are found in the world (or the Reward Pass), then learned and crafted,
 * so they are tracked like blueprints: learned + extras per character.
 *
 * Names and rarity: https://arcblueprinttracker.io/data/blueprints-grid (Stencils tab)
 * Compatible weapons: https://arcraiders.wiki/wiki/Stencils
 *
 * rarity: 'legendary' | 'epic' | 'rare' | 'uncommon' | 'common'
 * weapons: comma-separated list of weapons the stencil can be applied to
 */
const STENCILS = [
  // ─── Legendary ─────────────────────────────────────────────────────────────
  { name: 'Bulwark Stencil', rarity: 'legendary', weapons: 'Hullcracker' },
  { name: 'Dragon\'s Breath Stencil', rarity: 'legendary', weapons: 'Tempest' },
  { name: 'Serac Stencil', rarity: 'legendary', weapons: 'Bobcat' },

  // ─── Epic ──────────────────────────────────────────────────────────────────
  { name: 'Empyrean Stencil', rarity: 'epic', weapons: 'Osprey' },
  { name: 'Fortuna Stencil', rarity: 'epic', weapons: 'Anvil' },
  { name: 'Sacrifice Stencil', rarity: 'epic', weapons: 'Renegade' },
  { name: 'Slipstream Stencil', rarity: 'epic', weapons: 'Il Toro, Anvil, Rattler' },
  { name: 'Tortoise Stencil', rarity: 'epic', weapons: 'Anvil, Rattler' },

  // ─── Rare ──────────────────────────────────────────────────────────────────
  { name: 'Cerulean Stencil', rarity: 'rare', weapons: 'Osprey, Bobcat, Vulcano, Venator, Anvil, Bantam, Bettina, Arpeggio' },
  { name: 'Dusty Camo Stencil', rarity: 'rare', weapons: 'Il Toro, Burletta, Torrente, Stiletto, Rattler, Tempest' },
  { name: 'Milky Terracotta Stencil', rarity: 'rare', weapons: 'Canto, Hairpin, Burletta, Renegade, Ferro, Kettle' },

  // ─── Uncommon ──────────────────────────────────────────────────────────────
  { name: 'Garnet Stencil', rarity: 'uncommon', weapons: 'Osprey, Canto, Stitcher, Bobcat, Vulcano, Il Toro, Hairpin, Venator, Burletta, Torrente, Anvil, Bantam, Stiletto, Renegade, Ferro, Kettle, Rattler, Bettina, Arpeggio, Tempest' },
  { name: 'Ochre Stencil', rarity: 'uncommon', weapons: 'Osprey, Canto, Stitcher, Bobcat, Vulcano, Il Toro, Hairpin, Venator, Burletta, Torrente, Anvil, Bantam, Stiletto, Renegade, Ferro, Kettle, Rattler, Bettina, Arpeggio, Tempest' },
  { name: 'Verdigris Stencil', rarity: 'uncommon', weapons: 'Anvil' },
];

module.exports = STENCILS;
