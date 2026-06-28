'use strict';

// Epic and Legendary ARC parts dropped by high-tier ARC enemies.
// Source: https://arcraiders.wiki/wiki/ARC and https://arcraiders.wiki/wiki/Loot
const ARC_PARTS = [
  // ─── Legendary ─────────────────────────────────────────────────────────────
  {
    name: 'Queen Reactor',
    rarity: 'legendary',
    source: 'Queen',
    sort_order: 10,
  },
  {
    name: 'Matriarch Reactor',
    rarity: 'legendary',
    source: 'Matriarch',
    sort_order: 20,
  },

  // ─── Epic ───────────────────────────────────────────────────────────────────
  {
    name: 'Bastion Cell',
    rarity: 'epic',
    source: 'Bastion',
    sort_order: 110,
  },
  {
    name: 'Bombardier Cell',
    rarity: 'epic',
    source: 'Bombardier',
    sort_order: 120,
  },
  {
    name: 'Leaper Pulse Unit',
    rarity: 'epic',
    source: 'Leaper',
    sort_order: 130,
  },
  {
    name: 'Rocketeer Driver',
    rarity: 'epic',
    source: 'Rocketeer',
    sort_order: 140,
  },
  {
    name: 'Vaporizer Regulator',
    rarity: 'epic',
    source: 'Vaporizer',
    sort_order: 150,
  },
  {
    name: 'Turbine Compressor',
    rarity: 'epic',
    source: 'Turbine',
    sort_order: 160,
  },
  {
    name: 'Assessor Matrix',
    rarity: 'epic',
    source: 'Assessor',
    sort_order: 170,
  },
];

module.exports = ARC_PARTS;
