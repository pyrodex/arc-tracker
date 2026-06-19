'use strict';

/**
 * Complete ARC Raiders blueprint seed data.
 * Source: https://arcraiders.wiki/wiki/Blueprints (June 2026)
 *
 * Categories: weapons, mods, explosives, medicine, augments, utility, crafting
 * map: 'All' | 'Stella Montis' | 'The Blue Gate' | 'Stella Montis, The Blue Gate' | 'Condition Only' | 'N/A'
 * condition: conditions under which it spawns, or 'Any'
 */
const BLUEPRINTS = [
  // ─── Weapons ───────────────────────────────────────────────────────────────
  { name: 'Anvil',        category: 'weapons', map: 'All',          condition: 'Any',                          containers: 'Raider Containers',                          quest_reward: null,                    trials_reward: true  },
  { name: 'Aphelion',     category: 'weapons', map: 'Stella Montis',condition: 'Any',                          containers: 'Anywhere',                                   quest_reward: null,                    trials_reward: false },
  { name: 'Bettina',      category: 'weapons', map: 'All',          condition: 'Any',                          containers: 'Raider Containers',                          quest_reward: null,                    trials_reward: true  },
  { name: 'Bobcat',       category: 'weapons', map: 'Condition Only',condition: 'First Wave',                  containers: 'Anywhere, First Wave Cache',                  quest_reward: null,                    trials_reward: true  },
  { name: 'Burletta',     category: 'weapons', map: 'N/A',          condition: 'N/A',                          containers: 'N/A',                                        quest_reward: 'Industrial Espionage',   trials_reward: true  },
  { name: 'Canto',        category: 'weapons', map: 'Condition Only',condition: 'Hurricane',                   containers: 'First Wave Cache',                           quest_reward: null,                    trials_reward: true  },
  { name: 'Deadline',     category: 'weapons', map: 'Stella Montis',condition: 'Any',                          containers: 'Anywhere',                                   quest_reward: null,                    trials_reward: true  },
  { name: 'Dolabra',      category: 'weapons', map: 'Condition Only',condition: 'Close Scrutiny',              containers: 'ARC Assessor',                               quest_reward: null,                    trials_reward: false },
  { name: 'Equalizer',    category: 'weapons', map: 'Condition Only',condition: 'Harvester',                   containers: 'Harvester',                                  quest_reward: null,                    trials_reward: false },
  { name: 'Hullcracker',  category: 'weapons', map: 'N/A',          condition: 'N/A',                          containers: 'N/A',                                        quest_reward: "The Major's Footlocker", trials_reward: false },
  { name: 'Il Toro',      category: 'weapons', map: 'All',          condition: 'Any',                          containers: 'Raider Containers',                          quest_reward: null,                    trials_reward: true  },
  { name: 'Jupiter',      category: 'weapons', map: 'Condition Only',condition: 'Harvester',                   containers: 'Harvester',                                  quest_reward: null,                    trials_reward: false },
  { name: 'Osprey',       category: 'weapons', map: 'All',          condition: 'Any',                          containers: 'Raider Containers',                          quest_reward: null,                    trials_reward: true  },
  { name: 'Rascal',       category: 'weapons', map: 'All',          condition: 'Any',                          containers: 'Raider Containers',                          quest_reward: null,                    trials_reward: true  },
  { name: 'Tempest',      category: 'weapons', map: 'Condition Only',condition: 'Night Raid, Hurricane',        containers: 'Residential Containers, First Wave Cache',   quest_reward: null,                    trials_reward: true  },
  { name: 'Torrente',     category: 'weapons', map: 'All',          condition: 'Any',                          containers: 'Raider Containers',                          quest_reward: null,                    trials_reward: true  },
  { name: 'Trailblazer',  category: 'weapons', map: 'Stella Montis',condition: 'Any',                          containers: 'Anywhere',                                   quest_reward: null,                    trials_reward: true  },
  { name: 'Venator',      category: 'weapons', map: 'All',          condition: 'Any',                          containers: 'Raider Containers',                          quest_reward: null,                    trials_reward: true  },
  { name: 'Vulcano',      category: 'weapons', map: 'Condition Only',condition: 'Hidden Bunker, First Wave',   containers: 'Anywhere, First Wave Cache',                  quest_reward: null,                    trials_reward: true  },

  // ─── Weapon Mods ───────────────────────────────────────────────────────────
  { name: 'Angled Grip II',             category: 'mods', map: 'All',           condition: 'Any',                                         containers: 'Residential Containers', quest_reward: null, trials_reward: true  },
  { name: 'Angled Grip III',            category: 'mods', map: 'All',           condition: 'Electromagnetic Storm, Locked Gate, Night Raid', containers: 'Residential Containers', quest_reward: null, trials_reward: true  },
  { name: 'Compensator II',             category: 'mods', map: 'All',           condition: 'Any',                                         containers: 'Residential Containers', quest_reward: null, trials_reward: true  },
  { name: 'Compensator III',            category: 'mods', map: 'Condition Only',condition: 'Electromagnetic Storm, Locked Gate, Night Raid', containers: 'Residential Containers', quest_reward: null, trials_reward: true  },
  { name: 'Extended Barrel II',         category: 'mods', map: 'All',           condition: 'Any',                                         containers: 'Residential Containers', quest_reward: null, trials_reward: true  },
  { name: 'Extended Barrel III',        category: 'mods', map: 'Condition Only',condition: 'Electromagnetic Storm, Locked Gate, Night Raid', containers: 'Residential Containers', quest_reward: null, trials_reward: true  },
  { name: 'Extended Light Mag II',      category: 'mods', map: 'All',           condition: 'Any',                                         containers: 'Residential Containers', quest_reward: null, trials_reward: true  },
  { name: 'Extended Light Mag III',     category: 'mods', map: 'Condition Only',condition: 'Electromagnetic Storm, Locked Gate, Night Raid', containers: 'Residential Containers', quest_reward: null, trials_reward: true  },
  { name: 'Extended Medium Mag II',     category: 'mods', map: 'All',           condition: 'Night Raid',                                  containers: 'Residential Containers', quest_reward: null, trials_reward: true  },
  { name: 'Extended Medium Mag III',    category: 'mods', map: 'Condition Only',condition: 'Electromagnetic Storm, Locked Gate, Night Raid', containers: 'Residential Containers', quest_reward: null, trials_reward: true  },
  { name: 'Extended Shotgun Mag II',    category: 'mods', map: 'All',           condition: 'Any',                                         containers: 'Residential Containers', quest_reward: null, trials_reward: true  },
  { name: 'Extended Shotgun Mag III',   category: 'mods', map: 'Condition Only',condition: 'Electromagnetic Storm, Locked Gate, Night Raid', containers: 'Residential Containers', quest_reward: null, trials_reward: true  },
  { name: 'Lightweight Stock',          category: 'mods', map: 'Condition Only',condition: 'Electromagnetic Storm, Locked Gate, Night Raid', containers: 'Residential Containers', quest_reward: null, trials_reward: true  },
  { name: 'Muzzle Brake II',            category: 'mods', map: 'All',           condition: 'Any',                                         containers: 'Residential Containers', quest_reward: null, trials_reward: true  },
  { name: 'Muzzle Brake III',           category: 'mods', map: 'Condition Only',condition: 'Electromagnetic Storm, Locked Gate, Night Raid', containers: 'Residential Containers', quest_reward: null, trials_reward: true  },
  { name: 'Padded Stock',               category: 'mods', map: 'Condition Only',condition: 'Electromagnetic Storm, Locked Gate, Night Raid, Hidden Bunker', containers: 'Residential Containers', quest_reward: null, trials_reward: true  },
  { name: 'Shotgun Choke II',           category: 'mods', map: 'All',           condition: 'Any',                                         containers: 'Residential Containers', quest_reward: null, trials_reward: true  },
  { name: 'Shotgun Choke III',          category: 'mods', map: 'Condition Only',condition: 'Electromagnetic Storm, Locked Gate, Night Raid', containers: 'Residential Containers', quest_reward: null, trials_reward: true  },
  { name: 'Shotgun Silencer',           category: 'mods', map: 'Condition Only',condition: 'Electromagnetic Storm, Locked Gate, Night Raid, Hidden Bunker', containers: 'Residential Containers', quest_reward: null, trials_reward: true  },
  { name: 'Silencer I',                 category: 'mods', map: 'All',           condition: 'Any',                                         containers: 'Residential Containers', quest_reward: null, trials_reward: true  },
  { name: 'Silencer II',                category: 'mods', map: 'All',           condition: 'Any',                                         containers: 'Residential Containers', quest_reward: null, trials_reward: true  },
  { name: 'Stable Stock II',            category: 'mods', map: 'All',           condition: 'Any',                                         containers: 'Residential Containers', quest_reward: null, trials_reward: true  },
  { name: 'Stable Stock III',           category: 'mods', map: 'Condition Only',condition: 'Electromagnetic Storm, Locked Gate, Night Raid', containers: 'Residential Containers', quest_reward: null, trials_reward: true  },
  { name: 'Vertical Grip II',           category: 'mods', map: 'All',           condition: 'Any',                                         containers: 'Residential Containers', quest_reward: null, trials_reward: true  },
  { name: 'Vertical Grip III',          category: 'mods', map: 'Condition Only',condition: 'Electromagnetic Storm, Locked Gate, Night Raid', containers: 'Residential Containers', quest_reward: null, trials_reward: true  },

  // ─── Explosives ────────────────────────────────────────────────────────────
  { name: 'Blaze Grenade',    category: 'explosives', map: 'All',           condition: 'Any',                  containers: 'Industrial Containers', quest_reward: null,                   trials_reward: true  },
  { name: 'Explosive Mine',   category: 'explosives', map: 'All',           condition: 'Any',                  containers: 'Industrial Containers', quest_reward: null,                   trials_reward: true  },
  { name: 'Gas Mine',         category: 'explosives', map: 'Stella Montis', condition: 'Any',                  containers: 'Anywhere',             quest_reward: null,                   trials_reward: true  },
  { name: 'Jolt Mine',        category: 'explosives', map: 'All',           condition: 'Any',                  containers: 'Industrial Containers', quest_reward: null,                   trials_reward: true  },
  { name: 'Lure Grenade',     category: 'explosives', map: 'N/A',           condition: 'N/A',                  containers: 'N/A',                  quest_reward: 'Greasing Her Palms',   trials_reward: false },
  { name: 'Pulse Mine',       category: 'explosives', map: 'Stella Montis', condition: 'Any',                  containers: 'Anywhere',             quest_reward: null,                   trials_reward: true  },
  { name: 'Seeker Grenade',   category: 'explosives', map: 'Stella Montis', condition: 'Any',                  containers: 'Anywhere',             quest_reward: null,                   trials_reward: true  },
  { name: 'Showstopper',      category: 'explosives', map: 'All',           condition: 'Any',                  containers: 'Industrial Containers', quest_reward: null,                   trials_reward: true  },
  { name: 'Smoke Grenade',    category: 'explosives', map: 'All',           condition: 'Any',                  containers: 'Residential Containers', quest_reward: null,                  trials_reward: true  },
  { name: "Trigger 'Nade",    category: 'explosives', map: 'All',           condition: 'Any',                  containers: 'Anywhere',             quest_reward: 'Sparks Fly',           trials_reward: false },
  { name: 'Wolfpack',         category: 'explosives', map: 'Condition Only',condition: 'Night Raid',            containers: 'Residential Containers', quest_reward: null,                  trials_reward: true  },

  // ─── Medicine ──────────────────────────────────────────────────────────────
  { name: 'Defibrillator', category: 'medicine', map: 'All', condition: 'Any', containers: 'Medical Containers',             quest_reward: null,                   trials_reward: true  },
  { name: 'Vita Shot',     category: 'medicine', map: 'All', condition: 'Any', containers: 'Medical Containers, ARC Surveyor', quest_reward: null,                   trials_reward: true  },
  { name: 'Vita Spray',    category: 'medicine', map: 'All', condition: 'Any', containers: 'Medical Containers, ARC Surveyor', quest_reward: 'Worth Your Salt',       trials_reward: true  },

  // ─── Augments ──────────────────────────────────────────────────────────────
  { name: 'Combat Mk. 3 (Aggressive)',      category: 'augments', map: 'Stella Montis, The Blue Gate', condition: 'Any', containers: 'Medical Containers, Security Containers',    quest_reward: null, trials_reward: true  },
  { name: 'Combat Mk. 3 (Flanking)',        category: 'augments', map: 'Stella Montis, The Blue Gate', condition: 'Any', containers: 'Medical Containers, Security Containers',    quest_reward: null, trials_reward: true  },
  { name: 'Looting Mk. 3 (Safekeeper)',     category: 'augments', map: 'All',                          condition: 'Any', containers: 'Medical Containers, Security Containers, Metal Crate', quest_reward: null, trials_reward: true  },
  { name: 'Looting Mk. 3 (Survivor)',       category: 'augments', map: 'All',                          condition: 'Any', containers: 'Medical Containers, Security Containers, Metal Crate', quest_reward: null, trials_reward: true  },
  { name: 'Tactical Mk. 3 (Defensive)',     category: 'augments', map: 'Stella Montis, The Blue Gate', condition: 'Any', containers: 'Medical Containers, Security Containers, ARC Surveyor', quest_reward: null, trials_reward: true  },
  { name: 'Tactical Mk. 3 (Healing)',       category: 'augments', map: 'Stella Montis, The Blue Gate', condition: 'Any', containers: 'Medical Containers, Security Containers',    quest_reward: null, trials_reward: true  },
  { name: 'Tactical Mk. 3 (Revival)',       category: 'augments', map: 'Stella Montis, The Blue Gate', condition: 'Any', containers: 'Medical Containers, Security Containers',    quest_reward: null, trials_reward: true  },
  { name: 'Tactical Mk. 3 (Smoke)',         category: 'augments', map: 'Stella Montis, The Blue Gate', condition: 'Any', containers: 'Medical Containers, Security Containers',    quest_reward: null, trials_reward: true  },

  // ─── Utility ───────────────────────────────────────────────────────────────
  { name: 'Barricade Kit',      category: 'utility', map: 'All',           condition: 'Any',     containers: 'Electrical Containers', quest_reward: null,           trials_reward: true  },
  { name: 'Blue Light Stick',   category: 'utility', map: 'All',           condition: 'Any',     containers: 'Anywhere',             quest_reward: null,           trials_reward: true  },
  { name: 'Crash Mat',          category: 'utility', map: 'All',           condition: 'Any',     containers: 'Unknown',              quest_reward: null,           trials_reward: false },
  { name: 'Fireworks Box',      category: 'utility', map: 'Condition Only',condition: 'Cold Snap',containers: 'Anywhere',            quest_reward: 'Test Case',    trials_reward: false },
  { name: 'Green Light Stick',  category: 'utility', map: 'All',           condition: 'Any',     containers: 'Anywhere',             quest_reward: null,           trials_reward: true  },
  { name: 'Powered Descender',  category: 'utility', map: 'All',           condition: 'Any',     containers: 'Unknown',              quest_reward: null,           trials_reward: false },
  { name: 'Red Light Stick',    category: 'utility', map: 'All',           condition: 'Any',     containers: 'Anywhere',             quest_reward: null,           trials_reward: true  },
  { name: 'Remote Raider Flare',category: 'utility', map: 'All',           condition: 'Any',     containers: 'Electrical Containers', quest_reward: null,           trials_reward: true  },
  { name: 'Snap Hook',          category: 'utility', map: 'Condition Only',condition: 'Electromagnetic Storm', containers: 'Anywhere',    quest_reward: null,           trials_reward: false },
  { name: 'Surge Coil',         category: 'utility', map: 'Condition Only',condition: 'Electromagnetic Storm', containers: 'Unknown',    quest_reward: null,           trials_reward: false },
  { name: 'Tagging Grenade',    category: 'utility', map: 'All',           condition: 'Any',     containers: 'Electrical Containers', quest_reward: null,           trials_reward: true  },
  { name: 'White Flag',         category: 'utility', map: 'All',           condition: 'Any',     containers: 'Any',                  quest_reward: null,           trials_reward: true  },
  { name: 'Yellow Light Stick', category: 'utility', map: 'All',           condition: 'Any',     containers: 'Anywhere',             quest_reward: null,           trials_reward: true  },

  // ─── Crafting Components ───────────────────────────────────────────────────
  { name: 'Complex Gun Parts', category: 'crafting', map: 'All', condition: 'Any', containers: 'Security Containers', quest_reward: null, trials_reward: false },
  { name: 'Heavy Gun Parts',   category: 'crafting', map: 'All', condition: 'Any', containers: 'Raider Containers',  quest_reward: null, trials_reward: true  },
  { name: 'Light Gun Parts',   category: 'crafting', map: 'All', condition: 'Any', containers: 'Raider Containers',  quest_reward: null, trials_reward: true  },
  { name: 'Medium Gun Parts',  category: 'crafting', map: 'All', condition: 'Any', containers: 'Raider Containers',  quest_reward: null, trials_reward: true  },
];

module.exports = BLUEPRINTS;
