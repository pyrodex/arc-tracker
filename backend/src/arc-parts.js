'use strict';

// Epic and Legendary ARC parts dropped by high-tier ARC enemies.
// Source: https://arcraiders.wiki/wiki/ARC and https://arcraiders.wiki/wiki/Loot
// sell_value = in-game sell price per unit (credits)
const ARC_PARTS = [
  // ─── Legendary ─────────────────────────────────────────────────────────────
  { name: 'Queen Reactor',     rarity: 'legendary', source: 'Queen',      sell_value: 11000, sort_order: 10  },
  { name: 'Matriarch Reactor', rarity: 'legendary', source: 'Matriarch',  sell_value: 11000, sort_order: 20  },

  // ─── Epic ───────────────────────────────────────────────────────────────────
  { name: 'Bastion Cell',        rarity: 'epic', source: 'Bastion',     sell_value: 3000, sort_order: 110 },
  { name: 'Bombardier Cell',     rarity: 'epic', source: 'Bombardier',  sell_value: 3000, sort_order: 120 },
  { name: 'Leaper Pulse Unit',   rarity: 'epic', source: 'Leaper',      sell_value: 3000, sort_order: 130 },
  { name: 'Rocketeer Driver',    rarity: 'epic', source: 'Rocketeer',   sell_value: 3000, sort_order: 140 },
  { name: 'Vaporizer Regulator', rarity: 'epic', source: 'Vaporizer',   sell_value: 6000, sort_order: 150 },
  { name: 'Turbine Compressor',  rarity: 'epic', source: 'Turbine',     sell_value: 5000, sort_order: 160 },
  { name: 'Assessor Matrix',     rarity: 'epic', source: 'Assessor',    sell_value: 5000, sort_order: 170 },
];

module.exports = ARC_PARTS;
