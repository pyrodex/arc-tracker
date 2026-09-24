'use strict';

/**
 * Weapon sale prices in Coins, per upgrade tier.
 * Source: the individual weapon pages on https://arcraiders.wiki — e.g.
 * https://arcraiders.wiki/wiki/Bobcat ("Sale Price" section). The Weapons
 * index page carries no prices; only the per-weapon pages do.
 *
 * tier 0 means the weapon has no tiers (it cannot be upgraded) and has a
 * single price. 0 rather than NULL because SQLite treats NULLs as distinct
 * in a UNIQUE index, which would let duplicate rows through.
 *
 * These are seeded as defaults. A build stores its own weapon_value, so
 * editing a build never writes back here, and re-seeding never overwrites a
 * value already entered — see seedWeaponPrices in db.js.
 */

// The blueprint weapons mostly draw from one shared ladder, entering at a
// different rung:
//   2,900 → 5,000 → 7,000 → 10,000 → 13,000 → 17,000 → 22,000 → 27,000
// Bettina is the only blueprint weapon that breaks it. The Gunsmith-unlocked
// weapons ignore the ladder altogether, so it is a pattern among blueprint
// weapons rather than a rule — weaker evidence against Bettina than it first
// appeared, but its figures were still re-read from the page to confirm.
const WEAPON_PRICES = [
  // Gunsmith-unlocked weapons (no blueprint). These sit off the shared ladder
  // entirely — the ladder only ever described the blueprint weapons.
  { name: 'Hairpin',     tiers: [450, 1000, 2000, 2900] },
  { name: 'Ferro',       tiers: [475, 1000, 2000, 2900] },
  { name: 'Stitcher',    tiers: [800, 2000, 3000, 5000] },
  { name: 'Kettle',      tiers: [840, 2000, 3000, 5000] },
  { name: 'Rattler',     tiers: [1750, 3000, 5000, 7000] },
  { name: 'Arpeggio',    tiers: [5500, 8000, 11500, 15000] },
  { name: 'Renegade',    tiers: [7000, 10000, 13000, 17000] },

  { name: 'Burletta',    tiers: [2900, 5000, 7000, 10000] },
  { name: 'Anvil',       tiers: [5000, 7000, 10000, 13000] },
  { name: 'Il Toro',     tiers: [5000, 7000, 10000, 13000] },
  { name: 'Osprey',      tiers: [7000, 10000, 13000, 17000] },
  { name: 'Rascal',      tiers: [7000, 10000, 13000, 17000] },
  { name: 'Torrente',    tiers: [7000, 10000, 13000, 17000] },
  { name: 'Venator',     tiers: [7000, 10000, 13000, 17000] },
  { name: 'Bettina',     tiers: [8000, 11000, 14000, 18000] },
  { name: 'Hullcracker', tiers: [10000, 13000, 17000, 22000] },
  { name: 'Vulcano',     tiers: [10000, 13000, 17000, 22000] },
  { name: 'Bobcat',      tiers: [13000, 17000, 22000, 27000] },
  { name: 'Tempest',     tiers: [13000, 17000, 22000, 27000] },

  // Legendary weapons cannot be upgraded and sell for a flat 27,500.
  // Note: the Weapons index page also lists Rascal as non-upgradeable, but
  // Rascal's own page shows four tiers — so it is treated as tiered above.
  { name: 'Aphelion',  tiers: null, flat: 27500 },
  { name: 'Dolabra',   tiers: null, flat: 27500 },
  { name: 'Equalizer', tiers: null, flat: 27500 },
  { name: 'Jupiter',   tiers: null, flat: 27500 },

  // Canto is deliberately absent. Its page states the weapon has upgrade
  // tiers but shows a single untiered 7,000 figure in the spec table with no
  // per-tier breakdown, and every weapon's ladder differs, so the other three
  // tiers cannot be inferred. Its value is entered by hand per build until
  // the wiki fills the gap.
];

module.exports = WEAPON_PRICES;
