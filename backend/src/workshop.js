'use strict';

// Workshop stations (excludes the Workbench — it's free, starts unlocked, and
// can't be upgraded) with the materials required to build/upgrade each one up
// to level 3. Source: https://arcraiders.wiki/wiki/Workshop
//
// A handful of requirement items (Bastion Cell, Bombardier Cell, Leaper Pulse
// Unit, Rocketeer Driver) are also tracked as Epic ARC parts on the ARC Parts
// page. Those are cross-referenced by name against `arc-parts.js` at seed
// time so the app tracks a single shared count for them instead of asking
// the player to enter the same number twice.
const WORKSHOP_STATIONS = [
  {
    name: 'Gunsmith',
    sort_order: 10,
    levels: [
      { level: 1, materials: [{ name: 'Metal Parts', qty: 20 }, { name: 'Rubber Parts', qty: 30 }] },
      { level: 2, materials: [{ name: 'Rusted Tools', qty: 3 }, { name: 'Mechanical Components', qty: 5 }, { name: 'Wasp Driver', qty: 8 }] },
      { level: 3, materials: [{ name: 'Rusted Gear', qty: 3 }, { name: 'Advanced Mechanical Components', qty: 5 }, { name: 'Sentinel Firing Core', qty: 4 }] },
    ],
  },
  {
    name: 'Gear Bench',
    sort_order: 20,
    levels: [
      { level: 1, materials: [{ name: 'Plastic Parts', qty: 25 }, { name: 'Fabric', qty: 30 }] },
      { level: 2, materials: [{ name: 'Power Cable', qty: 3 }, { name: 'Electrical Components', qty: 5 }, { name: 'Hornet Driver', qty: 5 }] },
      { level: 3, materials: [{ name: 'Industrial Battery', qty: 3 }, { name: 'Advanced Electrical Components', qty: 5 }, { name: 'Bastion Cell', qty: 6 }] },
    ],
  },
  {
    name: 'Medical Lab',
    sort_order: 30,
    levels: [
      { level: 1, materials: [{ name: 'Fabric', qty: 50 }, { name: 'ARC Alloy', qty: 6 }] },
      { level: 2, materials: [{ name: 'Cracked Bioscanner', qty: 2 }, { name: 'Durable Cloth', qty: 5 }, { name: 'Tick Pod', qty: 8 }] },
      { level: 3, materials: [{ name: 'Rusted Shut Medical Kit', qty: 3 }, { name: 'Antiseptic', qty: 8 }, { name: 'Surveyor Vault', qty: 5 }] },
    ],
  },
  {
    name: 'Explosives Station',
    sort_order: 40,
    levels: [
      { level: 1, materials: [{ name: 'Chemicals', qty: 50 }, { name: 'ARC Alloy', qty: 6 }] },
      { level: 2, materials: [{ name: 'Synthesized Fuel', qty: 3 }, { name: 'Crude Explosives', qty: 5 }, { name: 'Pop Trigger', qty: 5 }] },
      { level: 3, materials: [{ name: 'Laboratory Reagents', qty: 3 }, { name: 'Explosive Compound', qty: 5 }, { name: 'Rocketeer Driver', qty: 3 }] },
    ],
  },
  {
    name: 'Utility Station',
    sort_order: 50,
    levels: [
      { level: 1, materials: [{ name: 'Plastic Parts', qty: 50 }, { name: 'ARC Alloy', qty: 6 }] },
      { level: 2, materials: [{ name: 'Damaged Heat Sink', qty: 2 }, { name: 'Electrical Components', qty: 5 }, { name: 'Snitch Scanner', qty: 6 }] },
      { level: 3, materials: [{ name: 'Fried Motherboard', qty: 3 }, { name: 'Advanced Electrical Components', qty: 5 }, { name: 'Leaper Pulse Unit', qty: 4 }] },
    ],
  },
  {
    name: 'Refiner',
    sort_order: 60,
    levels: [
      { level: 1, materials: [{ name: 'Metal Parts', qty: 60 }, { name: 'ARC Powercell', qty: 5 }] },
      { level: 2, materials: [{ name: 'Toaster', qty: 3 }, { name: 'ARC Motion Core', qty: 5 }, { name: 'Fireball Burner', qty: 8 }] },
      { level: 3, materials: [{ name: 'Motor', qty: 3 }, { name: 'ARC Circuitry', qty: 10 }, { name: 'Bombardier Cell', qty: 6 }] },
    ],
  },
];

module.exports = WORKSHOP_STATIONS;
