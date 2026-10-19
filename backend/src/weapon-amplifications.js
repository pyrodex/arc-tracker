'use strict';

/**
 * Weapon Amplification options (Frozen Trail, patch 2.0) for the 15 weapons
 * that can be amplified to Level 5.
 * Source: https://arcraiders.wiki/wiki/Amplified_Weapons (scraped per weapon).
 *
 * module      Amplification Module Mk. needed to reach Level 5. It matches the
 *             weapon's base rarity (Mk. I Common … Mk. V Legendary), per the wiki;
 *             per-weapon marks cross-checked against KeenGamer's amplified weapons guide.
 * research    Amplified Research project that unlocks the option, or null when
 *             none is listed (available once the weapon is Level 5).
 * materials   Cost to activate. Names match the Amplification and ARC Parts
 *             catalogs (e.g. Fossilized Lightning, Queen Reactor).
 * requires    Options that must already be active on the weapon.
 * conflicts   Options that can't be combined with this one. 'Magazine Mod' and
 *             'Stock Mod' mean the weapon can't also carry a mod in that slot.
 *
 * Once activated an amplification can't be removed in game; in this app a
 * build simply lists the ones it has.
 */

const WEAPON_AMPLIFICATIONS = [
  {
    weapon: "Kettle",
    module: 1,
    amplifications: [
      {
        name: "X-Rounds",
        description: "Adds an explosive compound to the projectile, dealing slightly increased damage to Raiders and significantly increased damage to ARC Armor plating.",
        effects: ["+6.5 Base Damage", "400% Increased Damage vs ARC Armor", "15% Increased Vertical Recoil", "15% Increased Horizontal Recoil", "30% Reduced Bullet Velocity", "20% Reduced Fire Rate", "-4 Magazine Size"],
        research: "Embedded Blast Engineering",
        materials: [{ name: "Fossilized Lightning", qty: 3 }],
        requires: [],
        conflicts: ["Anti-Shield", "Full-Auto", "Magazine Mod"],
      },
      {
        name: "Anti-Shield",
        description: "Redistributes damage to prioritize breaking shields faster.",
        effects: ["100% Increased Damage vs Raider Shields", "-2 Base Damage"],
        research: "Shield Stress Testing",
        materials: [{ name: "Assessor Matrix", qty: 3 }],
        requires: [],
        conflicts: ["X-Rounds"],
      },
      {
        name: "Full-Auto",
        description: "Makes the weapon fully automatic, at the cost of accuracy and stability.",
        effects: ["15% Increased Fire Rate", "20% Reduced Headshot Damage Multiplier", "30% Increased Vertical Recoil", "30% Increased Horizontal Recoil", "30% Increased Max Shot Dispersion"],
        research: null,
        materials: [{ name: "Pneumatic Actuator", qty: 3 }],
        requires: [],
        conflicts: ["X-Rounds"],
      },
    ],
  },
  {
    weapon: "Rattler",
    module: 1,
    amplifications: [
      {
        name: "More Reload",
        description: "Increases the number of bullets loaded at a time, reducing reload time.",
        effects: ["+2 Bullets Loaded at a time"],
        research: null,
        materials: [{ name: "Propellant Valve Assembly", qty: 2 }],
        requires: [],
        conflicts: [],
      },
      {
        name: "Drum Mag",
        description: "Significantly increases magazine capacity by attaching a drum mag. However, it must still be reloaded a couple of bullets at time.",
        effects: ["+40 Magazine Size", "50% Increased Vertical Recoil", "50% Increased Horizontal Recoil", "30% Increased Max Shot Dispersion", "30% Increased Base Dispersion", "30% Increased ADS Dispersion", "10% Reduced ADS Speed"],
        research: "Magazine Geometry 101",
        materials: [{ name: "Pressure Regulator", qty: 4 }],
        requires: ["More Reload"],
        conflicts: [],
      },
      {
        name: "Incendiary Rounds",
        description: "Adds an incendiary compound to the projectile, setting targets on fire when hit.",
        effects: ["+5/s Burn Damage", "+2s Burn Duration"],
        research: "Thermite-Tipped Rounds",
        materials: [{ name: "Fossilized Lightning", qty: 3 }],
        requires: [],
        conflicts: [],
      },
    ],
  },
  {
    weapon: "Bettina",
    module: 4,
    amplifications: [
      {
        name: "Bigger Mag",
        description: "Increases the magazine capacity.",
        effects: ["+15 Magazine Size"],
        research: null,
        materials: [{ name: "Pressure Regulator", qty: 3 }],
        requires: [],
        conflicts: ["Semi-Auto"],
      },
      {
        name: "Semi-Auto",
        description: "Makes the weapon semi-automatic.",
        effects: ["+3 Base Damage", "20% Reduced Max Shot Dispersion", "20% Reduced Fire Rate"],
        research: "Trigger Reset Systems",
        materials: [{ name: "Pneumatic Actuator", qty: 3 }],
        requires: [],
        conflicts: ["Bigger Mag"],
      },
      {
        name: "X-Rounds",
        description: "Adds an explosive compound to the projectile, dealing slightly increased damage to Raiders and significantly increased damage to ARC Armor plating.",
        effects: ["+3 Base Damage", "25% Increased Damage vs ARC Armor", "20% Increased Vertical Recoil", "20% Increased Horizontal Recoil", "30% Reduced Bullet Velocity", "-4 Magazine Size"],
        research: "Embedded Blast Engineering",
        materials: [{ name: "Fossilized Lightning", qty: 3 }],
        requires: ["Semi-Auto"],
        conflicts: ["Bigger Mag"],
      },
    ],
  },
  {
    weapon: "Renegade",
    module: 3,
    amplifications: [
      {
        name: "More Reload",
        description: "Increases the number of bullets loaded at a time, reducing reload time.",
        effects: ["+1 Bullets Loaded at a time"],
        research: null,
        materials: [{ name: "Propellant Valve Assembly", qty: 2 }],
        requires: [],
        conflicts: [],
      },
      {
        name: "Scoped",
        description: "Adds a scope to the weapon, allowing it to be fired from a scoped view.",
        effects: [],
        research: "Top Mounted Optics Retrofittings",
        materials: [{ name: "Fluted Rotor Core", qty: 4 }],
        requires: [],
        conflicts: ["Magazine Mod"],
      },
    ],
  },
  {
    weapon: "Aphelion",
    module: 5,
    amplifications: [
      {
        name: "Bigger Mag",
        description: "Increases the magazine capacity.",
        effects: ["+6 Magazine Size"],
        research: null,
        materials: [{ name: "Pressure Regulator", qty: 3 }],
        requires: [],
        conflicts: [],
      },
      {
        name: "Charged Burst",
        description: "Changes the firing mode to charge and release. The longer the charge is held, the more projectiles are fired upon release.",
        effects: ["+2 Max Projectiles in Burst", "+2 Magazine Size", "-2.5 Base Damage", "60% Increased Vertical Recoil", "60% Increased Horizontal Recoil"],
        research: "High-Voltage Exposure",
        materials: [{ name: "Queen Reactor", qty: 2 }],
        requires: [],
        conflicts: [],
      },
      {
        name: "Increased Burst",
        description: "Increases the number of projectiles fired within a burst.",
        effects: ["+2 Max Projectiles in Burst"],
        research: "Extended Burst Cycles",
        materials: [{ name: "Pressure Regulator", qty: 2 }],
        requires: ["Charged Burst"],
        conflicts: [],
      },
      {
        name: "Incendiary Rounds",
        description: "Adds an incendiary compound to the projectile, setting targets on fire when hit.",
        effects: ["+5/s Burn Damage", "+2s Burn Duration"],
        research: "Thermite-Tipped Rounds",
        materials: [{ name: "Fossilized Lightning", qty: 3 }],
        requires: [],
        conflicts: [],
      },
    ],
  },
  {
    weapon: "Canto",
    module: 3,
    amplifications: [
      {
        name: "Carbine Conversion",
        description: "Repurposes the Canto as a carbine, greatly improving stability and accuracy at the cost of agility.",
        effects: ["50% Reduced ADS Recoil", "20% Reduced Max Shot Dispersion", "20% Reduced Per-Shot Dispersion", "20% Reduced Base Dispersion", "10% Reduced Fire Rate", "20% Increased Equip Time", "20% Increased Unequip Time"],
        research: null,
        materials: [{ name: "Propellant Valve Assembly", qty: 3 }],
        requires: [],
        conflicts: ["Sprint Shooting", "Stock Mod"],
      },
      {
        name: "Sprint Shooting",
        description: "Ergonomic fittings that allow the weapon to be comfortably fired while sprinting.",
        effects: [],
        research: "Mobile-Fire Grip Fittings",
        materials: [{ name: "Fluted Rotor Core", qty: 4 }],
        requires: [],
        conflicts: ["Carbine Conversion", "Stock Mod"],
      },
      {
        name: "Incendiary Rounds",
        description: "Adds an incendiary compound to the projectile, setting targets on fire when hit.",
        effects: ["+5/s Burn Damage", "+2s Burn Duration"],
        research: "Thermite-Tipped Rounds",
        materials: [{ name: "Fossilized Lightning", qty: 3 }],
        requires: [],
        conflicts: [],
      },
    ],
  },
  {
    weapon: "Il Toro",
    module: 2,
    amplifications: [
      {
        name: "More Reload",
        description: "Increases the number of bullets loaded at a time, reducing reload time.",
        effects: ["+1 Shells Loaded at a time"],
        research: null,
        materials: [{ name: "Propellant Valve Assembly", qty: 2 }],
        requires: [],
        conflicts: [],
      },
      {
        name: "Slug Rounds",
        description: "Replaces the normal shotgun shells with a single large projectile that deals massive damage.",
        effects: ["-8 Projectiles Per Shot", "900% Increased Projectile Damage", "200% Increased Damage vs ARC Armor", "40% Reduced Base Dispersion", "50% Reduced Bullet Velocity"],
        research: "Solid-Core Casting Tech",
        materials: [{ name: "Turbine Compressor", qty: 4 }],
        requires: [],
        conflicts: [],
      },
    ],
  },
  {
    weapon: "Hairpin",
    module: 1,
    amplifications: [
      {
        name: "Incendiary Rounds",
        description: "Adds an incendiary compound to the projectile, setting targets on fire when hit.",
        effects: ["+5/s Burn Damage", "+2s Burn Duration"],
        research: "Thermite-Tipped Rounds",
        materials: [{ name: "Fossilized Lightning", qty: 3 }],
        requires: [],
        conflicts: ["Semi-Auto", "Tracker Rounds"],
      },
      {
        name: "Semi-Auto",
        description: "Makes the weapon semi-automatic.",
        effects: ["150% Increased Fire Rate", "20% Reduced Headshot Damage Multiplier", "40% Increased Per-Shot Dispersion"],
        research: "Trigger Reset Systems",
        materials: [{ name: "Pneumatic Actuator", qty: 3 }],
        requires: [],
        conflicts: ["Incendiary Rounds", "Tracker Rounds"],
      },
      {
        name: "Sprint Shooting",
        description: "Ergonomic fittings that allow the weapon to be comfortably fired while sprinting.",
        effects: [],
        research: "Mobile-Fire Grip Fittings",
        materials: [{ name: "Fluted Rotor Core", qty: 3 }],
        requires: ["Semi-Auto"],
        conflicts: [],
      },
      {
        name: "Tracker Rounds",
        description: "Replaces the bullets with tracker rounds that briefly reveal the position of targets they hit.",
        effects: ["+5s Tracking Duration"],
        research: null,
        materials: [{ name: "Matriarch Reactor", qty: 1 }],
        requires: [],
        conflicts: ["Incendiary Rounds", "Semi-Auto"],
      },
    ],
  },
  {
    weapon: "Burletta",
    module: 2,
    amplifications: [
      {
        name: "Burst Fire",
        description: "Makes the weapon fire in a burst.",
        effects: ["+2 Projectiles in Burst"],
        research: "Burst Assembly Recovery",
        materials: [{ name: "Queen Reactor", qty: 2 }],
        requires: [],
        conflicts: ["Full-Auto"],
      },
      {
        name: "Increased Burst",
        description: "Increases the number of projectiles fired within a burst.",
        effects: ["+2 Projectiles in Burst", "+3 Magazine Size"],
        research: "Extended Burst Cycles",
        materials: [{ name: "Pressure Regulator", qty: 2 }],
        requires: ["Burst Fire"],
        conflicts: [],
      },
      {
        name: "Full-Auto",
        description: "Makes the weapon fully automatic, at the cost of accuracy and stability.",
        effects: ["60% Increased Fire Rate", "-2 Base Damage", "60% Reduced Headshot Damage Multiplier", "50% Increased Vertical Recoil", "50% Increased Horizontal Recoil", "100% Increased Dispersion Recovery Time", "50% Increased Base Dispersion", "50% Increased ADS Dispersion"],
        research: null,
        materials: [{ name: "Pneumatic Actuator", qty: 3 }],
        requires: [],
        conflicts: ["Burst Fire"],
      },
      {
        name: "Sprint Shooting",
        description: "Ergonomic fittings that allow the weapon to be comfortably fired while sprinting.",
        effects: [],
        research: "Mobile-Fire Grip Fittings",
        materials: [{ name: "Fluted Rotor Core", qty: 4 }],
        requires: [],
        conflicts: [],
      },
    ],
  },
  {
    weapon: "Anvil",
    module: 3,
    amplifications: [
      {
        name: "X-Rounds",
        description: "Adds an explosive compound to the projectile, dealing slightly increased damage to Raiders and significantly increased damage to ARC Armor plating.",
        effects: ["+5 Base Damage", "33% Increased Damage vs ARC Armor", "10% Reduced Headshot Damage Multiplier", "30% Increased Vertical Recoil", "30% Increased Horizontal Recoil", "50% Reduced Bullet Velocity"],
        research: "Embedded Blast Engineering",
        materials: [{ name: "Fossilized Lightning", qty: 3 }],
        requires: [],
        conflicts: ["Anvil Splitter"],
      },
      {
        name: "Anvil Splitter",
        description: "Replaces the Anvil's bullets with rounds that split into four weaker projectiles.",
        effects: ["+3 Projectiles Per Shot", "30% Reduced Base Dispersion", "90% Reduced Dispersion Recovery Time", "40% Increased ADS Dispersion", "70% Reduced Projectile Damage", "40% Reduced Headshot Damage Multiplier"],
        research: null,
        materials: [{ name: "Turbine Compressor", qty: 3 }],
        requires: [],
        conflicts: ["X-Rounds"],
      },
    ],
  },
  {
    weapon: "Osprey",
    module: 3,
    amplifications: [
      {
        name: "Tracker Rounds",
        description: "Replaces the bullets with tracker rounds that briefly reveal the position of targets they hit.",
        effects: ["+5s Tracking Duration", "60% Reduced Bullet Velocity"],
        research: null,
        materials: [{ name: "Matriarch Reactor", qty: 2 }],
        requires: [],
        conflicts: ["Anti-Weak Point"],
      },
      {
        name: "Anti-Weak Point",
        description: "Deals increased damage to ARC weak points, but deals less damage to ARC armor plating.",
        effects: ["100% Increased Damage vs ARC Weak Points"],
        research: "Targeted Component Trial",
        materials: [{ name: "Assessor Matrix", qty: 2 }],
        requires: [],
        conflicts: ["Tracker Rounds"],
      },
      {
        name: "Ergonomic Bolt",
        description: "Ergonomic bolt that allows the user to perform the bolt-action while scoped.",
        effects: [],
        research: "Action Economy",
        materials: [{ name: "Fluted Rotor Core", qty: 3 }],
        requires: [],
        conflicts: ["Stock Mod"],
      },
    ],
  },
  {
    weapon: "Jupiter",
    module: 5,
    amplifications: [
      {
        name: "Bigger Mag",
        description: "Increases the magazine capacity.",
        effects: ["+5 Magazine Size"],
        research: null,
        materials: [{ name: "Pressure Regulator", qty: 3 }],
        requires: [],
        conflicts: [],
      },
      {
        name: "Scoped",
        description: "Adds a scope to the weapon, allowing it to be fired from a scoped view.",
        effects: [],
        research: "Top Mounted Optics Retrofittings",
        materials: [{ name: "Fluted Rotor Core", qty: 3 }],
        requires: [],
        conflicts: [],
      },
      {
        name: "Ergonomic Bolt",
        description: "Ergonomic bolt that allows the user to perform the bolt-action while scoped.",
        effects: [],
        research: "Action Economy",
        materials: [{ name: "Fluted Rotor Core", qty: 3 }],
        requires: [],
        conflicts: [],
      },
    ],
  },
  {
    weapon: "Rascal",
    module: 3,
    amplifications: [
      {
        name: "High Velocity",
        description: "Increases the velocity of the projectile fired.",
        effects: ["100% Increased Projectile Velocity", "50% Reduced ADS Dispersion"],
        research: null,
        materials: [{ name: "Pneumatic Actuator", qty: 2 }],
        requires: [],
        conflicts: [],
      },
      {
        name: "Sprint Shooting",
        description: "Ergonomic fittings that allow the weapon to be comfortably fired while sprinting.",
        effects: [],
        research: "Mobile-Fire Grip Fittings",
        materials: [{ name: "Fluted Rotor Core", qty: 2 }],
        requires: [],
        conflicts: [],
      },
      {
        name: "Incendiary Grenades",
        description: "Adds an incendiary compound to the projectile, causing it to spread fire when detonating on ARC.",
        effects: ["+11.25/s Burn Damage", "+5s Burn Duration", "40% Reduced Projectile Damage", "15% Reduced Projectile Velocity"],
        research: "Compact Combustion Charges",
        materials: [{ name: "Fossilized Lightning", qty: 3 }],
        requires: [],
        conflicts: [],
      },
    ],
  },
  {
    weapon: "Hullcracker",
    module: 4,
    amplifications: [
      {
        name: "Incendiary Grenades",
        description: "Adds an incendiary compound to the projectile, causing it to spread fire when detonating on ARC.",
        effects: ["+11.25/s Burn Damage", "+5s Burn Duration", "40% Reduced Projectile Damage", "50% Reduced Projectile Velocity"],
        research: "Compact Combustion Charges",
        materials: [{ name: "Fossilized Lightning", qty: 3 }],
        requires: [],
        conflicts: [],
      },
      {
        name: "Mag Reload",
        description: "Removes the need to reload one projectile at a time.",
        effects: [],
        research: null,
        materials: [{ name: "Propellant Valve Assembly", qty: 3 }],
        requires: [],
        conflicts: [],
      },
    ],
  },
  {
    weapon: "Equalizer",
    module: 5,
    amplifications: [
      {
        name: "Ramping Damage",
        description: "Gradually increases the Equalizer's damage while its laser remains in contact with a valid target.",
        effects: [],
        research: "Beam Resonance Tech",
        materials: [{ name: "Queen Reactor", qty: 3 }],
        requires: [],
        conflicts: ["Anti-Weak Point"],
      },
      {
        name: "Anti-Weak Point",
        description: "Deals increased damage to ARC weak points, but deals less damage to ARC armor plating.",
        effects: ["67% Increased Damage vs ARC Weak Points", "60% Reduced Damage vs ARC Armor"],
        research: "Targeted Component Trial",
        materials: [{ name: "Assessor Matrix", qty: 2 }],
        requires: [],
        conflicts: ["Ramping Damage"],
      },
      {
        name: "Bigger Mag",
        description: "Increases the magazine capacity.",
        effects: ["+30 Magazine Size"],
        research: null,
        materials: [{ name: "Pressure Regulator", qty: 3 }],
        requires: [],
        conflicts: [],
      },
    ],
  },
];

/** Conflict keywords that refer to a weapon mod slot rather than another option. */
const MOD_SLOT_CONFLICTS = { 'Magazine Mod': 'magazine', 'Stock Mod': 'stock' };

module.exports = { WEAPON_AMPLIFICATIONS, MOD_SLOT_CONFLICTS };
