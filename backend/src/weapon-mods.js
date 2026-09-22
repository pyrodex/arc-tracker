'use strict';

/**
 * Weapon mod catalog — every attachment that can go on a gun.
 * Source: https://arcraiders.wiki/wiki/Weapon_Mods
 *
 * This is deliberately a superset of the `mods` blueprints. `blueprints.js`
 * only carries the 25 mods that are craftable at Gunsmith 2/3, but a gun can
 * also mount:
 *   - tier I mods (Gunsmith 1), which are craftable but were never seeded, and
 *   - loot-only mods (Silencer III, Horizontal Grip, Kinetic Converter,
 *     Anvil Splitter), which have no blueprint at all.
 *
 * Craftable mods are cross-referenced to their blueprint row by name at seed
 * time — the same approach `workshop_requirements` uses for ARC parts — so a
 * mod that is also a blueprint stays a single item, not two.
 *
 * slot     — the physical slot the mod occupies. A gun mounts at most one mod
 *            per slot; this is enforced by a UNIQUE(config_id, slot) index.
 * variant  — narrows a slot to a weapon family where the game does. Shotgun
 *            chokes and the shotgun silencer are muzzle mods, and the three
 *            magazine sizes all occupy the single magazine slot, so they are
 *            modelled as variants rather than as slots of their own.
 * value    — sale price in Coins, from each mod's own wiki page ("General Data").
 *            The Weapon_Mods index page carries no prices; only the individual
 *            mod pages do. Seeded as a default: re-seeding never overwrites a
 *            price already stored, so anything edited in the UI wins.
 *
 * The prices follow a tight pattern — tier I 640, tier II 2,000, tier III
 * 5,000, loot-only 7,000 — with two real exceptions: Extended Barrel runs
 * 1,000/3,000/5,000, and Silencer is shifted a rung up (2,000/5,000/7,000),
 * matching its blueprint being Gunsmith 2/3 rather than 1/2/3.
 *
 * Extended Medium Mag I is 0 because its page shows no coin value at all —
 * the page was searched in full, not just its General Data table. By the
 * pattern it is almost certainly 640, but guessing a price into a value
 * report is worse than leaving it blank, and a 0 is flagged in the UI.
 */

const MUZZLE = 'muzzle';
const UNDERBARREL = 'underbarrel';
const STOCK = 'stock';
const MAGAZINE = 'magazine';
const TECH = 'tech';

const WEAPON_MODS = [
  // ─── Muzzle ────────────────────────────────────────────────────────────────
  { name: 'Compensator I',          slot: MUZZLE, variant: null, craftable: true, value: 640 },
  { name: 'Compensator II',         slot: MUZZLE, variant: null, craftable: true, value: 2000 },
  { name: 'Compensator III',        slot: MUZZLE, variant: null, craftable: true, value: 5000 },
  { name: 'Extended Barrel I',      slot: MUZZLE, variant: null, craftable: true, value: 1000 },
  { name: 'Extended Barrel II',     slot: MUZZLE, variant: null, craftable: true, value: 3000 },
  { name: 'Extended Barrel III',    slot: MUZZLE, variant: null, craftable: true, value: 5000 },
  { name: 'Muzzle Brake I',         slot: MUZZLE, variant: null, craftable: true, value: 640 },
  { name: 'Muzzle Brake II',        slot: MUZZLE, variant: null, craftable: true, value: 2000 },
  { name: 'Muzzle Brake III',       slot: MUZZLE, variant: null, craftable: true, value: 5000 },
  { name: 'Silencer I',             slot: MUZZLE, variant: null, craftable: true, value: 2000 },
  { name: 'Silencer II',            slot: MUZZLE, variant: null, craftable: true, value: 5000 },
  { name: 'Silencer III',           slot: MUZZLE, variant: null, craftable: false, value: 7000 },

  // Shotgun muzzle mods share the muzzle slot — a shotgun still mounts only one.
  { name: 'Shotgun Choke I',        slot: MUZZLE, variant: 'shotgun', craftable: true, value: 640 },
  { name: 'Shotgun Choke II',       slot: MUZZLE, variant: 'shotgun', craftable: true, value: 2000 },
  { name: 'Shotgun Choke III',      slot: MUZZLE, variant: 'shotgun', craftable: true, value: 5000 },
  { name: 'Shotgun Silencer',       slot: MUZZLE, variant: 'shotgun', craftable: true, value: 5000 },

  // ─── Underbarrel ───────────────────────────────────────────────────────────
  { name: 'Angled Grip I',          slot: UNDERBARREL, variant: null, craftable: true, value: 640 },
  { name: 'Angled Grip II',         slot: UNDERBARREL, variant: null, craftable: true, value: 2000 },
  { name: 'Angled Grip III',        slot: UNDERBARREL, variant: null, craftable: true, value: 5000 },
  { name: 'Vertical Grip I',        slot: UNDERBARREL, variant: null, craftable: true, value: 640 },
  { name: 'Vertical Grip II',       slot: UNDERBARREL, variant: null, craftable: true, value: 2000 },
  { name: 'Vertical Grip III',      slot: UNDERBARREL, variant: null, craftable: true, value: 5000 },
  { name: 'Horizontal Grip',        slot: UNDERBARREL, variant: null, craftable: false, value: 7000 },

  // ─── Stock ─────────────────────────────────────────────────────────────────
  { name: 'Stable Stock I',         slot: STOCK, variant: null, craftable: true, value: 640 },
  { name: 'Stable Stock II',        slot: STOCK, variant: null, craftable: true, value: 2000 },
  { name: 'Stable Stock III',       slot: STOCK, variant: null, craftable: true, value: 5000 },
  { name: 'Lightweight Stock',      slot: STOCK, variant: null, craftable: true, value: 5000 },
  { name: 'Padded Stock',           slot: STOCK, variant: null, craftable: true, value: 5000 },
  { name: 'Kinetic Converter',      slot: STOCK, variant: null, craftable: false, value: 7000 },

  // ─── Magazine ──────────────────────────────────────────────────────────────
  { name: 'Extended Light Mag I',      slot: MAGAZINE, variant: 'light',   craftable: true, value: 640 },
  { name: 'Extended Light Mag II',     slot: MAGAZINE, variant: 'light',   craftable: true, value: 2000 },
  { name: 'Extended Light Mag III',    slot: MAGAZINE, variant: 'light',   craftable: true, value: 5000 },
  { name: 'Extended Medium Mag I',     slot: MAGAZINE, variant: 'medium',  craftable: true, value: 0 },
  { name: 'Extended Medium Mag II',    slot: MAGAZINE, variant: 'medium',  craftable: true, value: 2000 },
  { name: 'Extended Medium Mag III',   slot: MAGAZINE, variant: 'medium',  craftable: true, value: 5000 },
  { name: 'Extended Shotgun Mag I',    slot: MAGAZINE, variant: 'shotgun', craftable: true, value: 640 },
  { name: 'Extended Shotgun Mag II',   slot: MAGAZINE, variant: 'shotgun', craftable: true, value: 2000 },
  { name: 'Extended Shotgun Mag III',  slot: MAGAZINE, variant: 'shotgun', craftable: true, value: 5000 },

  // ─── Tech ──────────────────────────────────────────────────────────────────
  { name: 'Anvil Splitter',         slot: TECH, variant: null, craftable: false, value: 7000 },
];

// Slot metadata drives the config editor's layout and the one-per-slot rule.
const MOD_SLOTS = [
  { slot: MUZZLE,      label: 'Muzzle',      sort_order: 10 },
  { slot: UNDERBARREL, label: 'Underbarrel', sort_order: 20 },
  { slot: MAGAZINE,    label: 'Magazine',    sort_order: 30 },
  { slot: STOCK,       label: 'Stock',       sort_order: 40 },
  { slot: TECH,        label: 'Tech',        sort_order: 50 },
];

module.exports = { WEAPON_MODS, MOD_SLOTS, SLOTS: { MUZZLE, UNDERBARREL, STOCK, MAGAZINE, TECH } };
