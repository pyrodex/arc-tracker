'use strict';

/**
 * Weapon catalog — every gun in the game, with its class and how it's obtained.
 * Source: https://arcraiders.wiki/wiki/Weapons and the individual weapon pages.
 *
 * Like `weapon-mods.js`, this is deliberately a superset of the `weapons`
 * blueprints. `blueprints.js` carries the 17 weapons that have a blueprint to
 * find, but seven more are unlocked purely by levelling the Gunsmith and have
 * no blueprint at all:
 *
 *   Hairpin, Ferro, Stitcher, Kettle, Rattler (Gunsmith 1),
 *   Arpeggio (Gunsmith 2), Renegade (Gunsmith 3)
 *
 * Those seven belong in a loadout but not on the Blueprints page — there is no
 * blueprint to learn, so tracking them there would be meaningless. Weapons that
 * DO have a blueprint are cross-referenced to it by name at seed time, the same
 * way mods are, so a weapon stays a single item.
 *
 * gunsmith_level is the station level needed to craft the tier I weapon, or
 * null where the weapon is not craftable at the Gunsmith at all.
 * tiered is false for Legendary weapons, which cannot be upgraded.
 */

const WEAPONS = [
  // ─── Assault Rifles ────────────────────────────────────────────────────────
  { name: 'Kettle',      class: 'Assault Rifle', rarity: 'Common',   gunsmith_level: 1,    tiered: true },
  { name: 'Rattler',     class: 'Assault Rifle', rarity: 'Common',   gunsmith_level: 1,    tiered: true },
  { name: 'Arpeggio',    class: 'Assault Rifle', rarity: 'Uncommon', gunsmith_level: 2,    tiered: true },
  { name: 'Tempest',     class: 'Assault Rifle', rarity: null,       gunsmith_level: null, tiered: true },
  { name: 'Bettina',     class: 'Assault Rifle', rarity: null,       gunsmith_level: null, tiered: true },

  // ─── Battle Rifles ─────────────────────────────────────────────────────────
  { name: 'Ferro',       class: 'Battle Rifle',  rarity: 'Common',    gunsmith_level: 1,    tiered: true },
  { name: 'Renegade',    class: 'Battle Rifle',  rarity: 'Rare',      gunsmith_level: 3,    tiered: true },
  { name: 'Aphelion',    class: 'Battle Rifle',  rarity: 'Legendary', gunsmith_level: null, tiered: false },

  // ─── SMGs ──────────────────────────────────────────────────────────────────
  { name: 'Stitcher',    class: 'SMG',           rarity: 'Common',   gunsmith_level: 1,    tiered: true },
  { name: 'Canto',       class: 'SMG',           rarity: null,       gunsmith_level: null, tiered: true },
  { name: 'Bobcat',      class: 'SMG',           rarity: null,       gunsmith_level: null, tiered: true },

  // ─── Shotguns ──────────────────────────────────────────────────────────────
  { name: 'Il Toro',     class: 'Shotgun',       rarity: null,        gunsmith_level: null, tiered: true },
  { name: 'Vulcano',     class: 'Shotgun',       rarity: null,        gunsmith_level: null, tiered: true },
  { name: 'Dolabra',     class: 'Shotgun',       rarity: 'Legendary', gunsmith_level: null, tiered: false },

  // ─── Pistols ───────────────────────────────────────────────────────────────
  { name: 'Hairpin',     class: 'Pistol',        rarity: 'Common',   gunsmith_level: 1,    tiered: true },
  { name: 'Burletta',    class: 'Pistol',        rarity: null,       gunsmith_level: null, tiered: true },
  { name: 'Venator',     class: 'Pistol',        rarity: null,       gunsmith_level: null, tiered: true },

  // ─── Hand Cannons ──────────────────────────────────────────────────────────
  { name: 'Anvil',       class: 'Hand Cannon',   rarity: null,       gunsmith_level: null, tiered: true },

  // ─── LMGs ──────────────────────────────────────────────────────────────────
  { name: 'Torrente',    class: 'LMG',           rarity: null,       gunsmith_level: null, tiered: true },

  // ─── Sniper Rifles ─────────────────────────────────────────────────────────
  { name: 'Osprey',      class: 'Sniper Rifle',  rarity: null,        gunsmith_level: null, tiered: true },
  { name: 'Jupiter',     class: 'Sniper Rifle',  rarity: 'Legendary', gunsmith_level: null, tiered: false },

  // ─── Specials ──────────────────────────────────────────────────────────────
  // Rascal is listed as non-upgradeable on the Weapons index page, but its own
  // page shows four tiers and the icon map starts it at II, so it is tiered.
  { name: 'Rascal',      class: 'Special',       rarity: null,        gunsmith_level: null, tiered: true },
  { name: 'Hullcracker', class: 'Special',       rarity: null,        gunsmith_level: null, tiered: true },
  { name: 'Equalizer',   class: 'Special',       rarity: 'Legendary', gunsmith_level: null, tiered: false },
];

// Display order for grouping the weapon picker.
const WEAPON_CLASSES = [
  'Assault Rifle', 'Battle Rifle', 'SMG', 'Shotgun', 'Pistol',
  'Hand Cannon', 'LMG', 'Sniper Rifle', 'Special',
];

module.exports = { WEAPONS, WEAPON_CLASSES };
