'use strict';

const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const BLUEPRINTS = require('./blueprints');
const ARC_PARTS = require('./arc-parts');
const WORKSHOP_STATIONS = require('./workshop');
const { WEAPON_MODS, MOD_SLOTS } = require('./weapon-mods');
const WEAPON_PRICES = require('./weapon-prices');
const { WEAPONS, WEAPON_CLASSES } = require('./weapons');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '../../data');
const DB_PATH = path.join(DATA_DIR, 'arc-tracker.db');

fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('synchronous = NORMAL');

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS blueprints (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      name          TEXT    NOT NULL UNIQUE,
      slug          TEXT    NOT NULL UNIQUE,
      category      TEXT    NOT NULL,
      map           TEXT,
      condition     TEXT,
      containers    TEXT,
      quest_reward  TEXT,
      trials_reward INTEGER DEFAULT 0,
      in_game       INTEGER DEFAULT 1,
      sort_order    INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS characters (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      name         TEXT    NOT NULL,
      label        TEXT,
      notes        TEXT,
      color        TEXT    NOT NULL DEFAULT '#3b82f6',
      sort_order   INTEGER DEFAULT 0,
      nomad_stash  INTEGER DEFAULT 0,
      parent_id    INTEGER REFERENCES characters(id) ON DELETE SET NULL,
      created_at   TEXT    DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS blueprint_tracking (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      character_id INTEGER NOT NULL,
      blueprint_id INTEGER NOT NULL,
      learned      INTEGER DEFAULT 0,
      extras       INTEGER DEFAULT 0,
      updated_at   TEXT    DEFAULT (datetime('now')),
      FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE,
      FOREIGN KEY (blueprint_id) REFERENCES blueprints(id),
      UNIQUE(character_id, blueprint_id)
    );

    CREATE INDEX IF NOT EXISTS idx_tracking_char   ON blueprint_tracking(character_id);
    CREATE INDEX IF NOT EXISTS idx_tracking_bp     ON blueprint_tracking(blueprint_id);
    CREATE INDEX IF NOT EXISTS idx_blueprints_cat  ON blueprints(category);

    CREATE TABLE IF NOT EXISTS arc_parts (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT    NOT NULL UNIQUE,
      slug       TEXT    NOT NULL UNIQUE,
      rarity     TEXT    NOT NULL,
      source     TEXT    NOT NULL,
      sell_value INTEGER DEFAULT 0,
      sort_order INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS arc_parts_tracking (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      character_id INTEGER NOT NULL,
      part_id      INTEGER NOT NULL,
      count        INTEGER DEFAULT 0,
      updated_at   TEXT    DEFAULT (datetime('now')),
      FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE,
      FOREIGN KEY (part_id)      REFERENCES arc_parts(id),
      UNIQUE(character_id, part_id)
    );

    CREATE INDEX IF NOT EXISTS idx_arc_tracking_char ON arc_parts_tracking(character_id);
    CREATE INDEX IF NOT EXISTS idx_arc_tracking_part ON arc_parts_tracking(part_id);

    CREATE TABLE IF NOT EXISTS workshop_stations (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT    NOT NULL UNIQUE,
      slug       TEXT    NOT NULL UNIQUE,
      sort_order INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS workshop_materials (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT    NOT NULL UNIQUE,
      slug       TEXT    NOT NULL UNIQUE,
      sort_order INTEGER DEFAULT 0
    );

    -- item_type/item_id is a lightweight polymorphic reference: 'material' points
    -- at workshop_materials, 'arc_part' points at the existing arc_parts table so
    -- items tracked in both places (e.g. Bastion Cell) share one count.
    CREATE TABLE IF NOT EXISTS workshop_requirements (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      station_id   INTEGER NOT NULL,
      level        INTEGER NOT NULL,
      item_type    TEXT    NOT NULL CHECK (item_type IN ('material', 'arc_part')),
      item_id      INTEGER NOT NULL,
      qty_required INTEGER NOT NULL,
      sort_order   INTEGER DEFAULT 0,
      FOREIGN KEY (station_id) REFERENCES workshop_stations(id),
      UNIQUE(station_id, level, item_type, item_id)
    );

    CREATE INDEX IF NOT EXISTS idx_workshop_req_station ON workshop_requirements(station_id);

    CREATE TABLE IF NOT EXISTS workshop_material_tracking (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      character_id INTEGER NOT NULL,
      material_id  INTEGER NOT NULL,
      count        INTEGER DEFAULT 0,
      updated_at   TEXT    DEFAULT (datetime('now')),
      FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE,
      FOREIGN KEY (material_id) REFERENCES workshop_materials(id),
      UNIQUE(character_id, material_id)
    );

    CREATE INDEX IF NOT EXISTS idx_workshop_mat_tracking_char ON workshop_material_tracking(character_id);
    CREATE INDEX IF NOT EXISTS idx_workshop_mat_tracking_mat  ON workshop_material_tracking(material_id);

    CREATE TABLE IF NOT EXISTS workshop_station_progress (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      character_id INTEGER NOT NULL,
      station_id   INTEGER NOT NULL,
      level        INTEGER DEFAULT 0,
      updated_at   TEXT    DEFAULT (datetime('now')),
      FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE,
      FOREIGN KEY (station_id) REFERENCES workshop_stations(id),
      UNIQUE(character_id, station_id)
    );

    CREATE INDEX IF NOT EXISTS idx_workshop_progress_char ON workshop_station_progress(character_id);

    -- Gun mod catalog. A superset of the 'mods' blueprints: it also carries the
    -- tier I mods and the loot-only mods, neither of which has a blueprint row.
    -- blueprint_id is NULL for anything that cannot be crafted.
    CREATE TABLE IF NOT EXISTS weapon_mods (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      name         TEXT    NOT NULL UNIQUE,
      slug         TEXT    NOT NULL UNIQUE,
      slot         TEXT    NOT NULL CHECK (slot IN ('muzzle','underbarrel','stock','magazine','tech')),
      variant      TEXT,
      craftable    INTEGER DEFAULT 1,
      blueprint_id INTEGER REFERENCES blueprints(id),
      sell_value   INTEGER DEFAULT 0,
      sort_order   INTEGER DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_weapon_mods_slot ON weapon_mods(slot);

    -- Weapon catalog. A superset of the 'weapons' blueprints: it also carries
    -- the seven guns unlocked by levelling the Gunsmith, which have no
    -- blueprint. blueprint_id is NULL for those.
    CREATE TABLE IF NOT EXISTS weapons (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      name           TEXT    NOT NULL UNIQUE,
      slug           TEXT    NOT NULL UNIQUE,
      class          TEXT    NOT NULL,
      rarity         TEXT,
      gunsmith_level INTEGER,
      tiered         INTEGER DEFAULT 1,
      blueprint_id   INTEGER REFERENCES blueprints(id),
      sort_order     INTEGER DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_weapons_class ON weapons(class);

    -- A specific build: a weapon at a tier, owned by one character, with a
    -- quantity and the weapon's own value at that tier. Mod values come from
    -- the catalog; weapon value is per-config because it varies by tier.
    CREATE TABLE IF NOT EXISTS gun_configs (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      character_id  INTEGER NOT NULL,
      weapon_id     INTEGER NOT NULL,
      name          TEXT,
      tier          INTEGER CHECK (tier IS NULL OR (tier >= 1 AND tier <= 4)),
      quantity      INTEGER DEFAULT 0,
      weapon_value  INTEGER DEFAULT 0,
      notes         TEXT,
      created_at    TEXT    DEFAULT (datetime('now')),
      updated_at    TEXT    DEFAULT (datetime('now')),
      FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE,
      FOREIGN KEY (weapon_id)    REFERENCES weapons(id)
    );

    CREATE INDEX IF NOT EXISTS idx_gun_configs_char ON gun_configs(character_id);

    -- UNIQUE(config_id, slot) is what enforces "one mod per slot" — the rule
    -- lives in the schema so the API cannot drift from it.
    CREATE TABLE IF NOT EXISTS gun_config_mods (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      config_id INTEGER NOT NULL,
      mod_id    INTEGER NOT NULL,
      slot      TEXT    NOT NULL,
      FOREIGN KEY (config_id) REFERENCES gun_configs(id) ON DELETE CASCADE,
      FOREIGN KEY (mod_id)    REFERENCES weapon_mods(id),
      UNIQUE(config_id, slot),
      UNIQUE(config_id, mod_id)
    );

    CREATE INDEX IF NOT EXISTS idx_gun_config_mods_config ON gun_config_mods(config_id);

    -- Seeded weapon sale prices per tier. tier 0 means "cannot be upgraded"
    -- and holds the weapon's single price; 0 rather than NULL because SQLite
    -- treats NULLs as distinct in a UNIQUE index.
    -- A build stores its own weapon_value, so this table is a default source,
    -- never written to by the app.
    CREATE TABLE IF NOT EXISTS weapon_prices (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      weapon_id  INTEGER NOT NULL,
      tier       INTEGER NOT NULL,
      sell_value INTEGER NOT NULL,
      FOREIGN KEY (weapon_id) REFERENCES weapons(id),
      UNIQUE(weapon_id, tier)
    );
  `);
}

function seedBlueprints() {
  const categoryOrder = ['weapons', 'mods', 'explosives', 'medicine', 'augments', 'utility', 'crafting'];

  const insert = db.prepare(`
    INSERT OR IGNORE INTO blueprints
      (name, slug, category, map, condition, containers, quest_reward, trials_reward, in_game, sort_order)
    VALUES
      (@name, @slug, @category, @map, @condition, @containers, @quest_reward, @trials_reward, @in_game, @sort_order)
  `);

  // Sync mutable fields so seed corrections are reflected in existing databases.
  const syncFields = db.prepare(`
    UPDATE blueprints
    SET category = @category, in_game = @in_game
    WHERE name = @name AND (category != @category OR in_game != @in_game)
  `);

  const upsertMany = db.transaction((blueprints) => {
    blueprints.forEach((bp, i) => {
      const in_game = bp.in_game === false ? 0 : 1;
      insert.run({
        name: bp.name,
        slug: slugify(bp.name),
        category: bp.category,
        map: bp.map || 'All',
        condition: bp.condition || 'Any',
        containers: bp.containers || null,
        quest_reward: bp.quest_reward || null,
        trials_reward: bp.trials_reward ? 1 : 0,
        in_game,
        sort_order: categoryOrder.indexOf(bp.category) * 100 + i,
      });
      syncFields.run({ name: bp.name, category: bp.category, in_game });
    });
  });

  const before = db.prepare('SELECT COUNT(*) as c FROM blueprints').get().c;
  upsertMany(BLUEPRINTS);
  const after = db.prepare('SELECT COUNT(*) as c FROM blueprints').get().c;
  if (after > before) console.log(`Seeded ${after - before} new blueprint(s) (total: ${after})`);
}

function seedArcParts() {
  const insert = db.prepare(`
    INSERT OR IGNORE INTO arc_parts (name, slug, rarity, source, sell_value, sort_order)
    VALUES (@name, @slug, @rarity, @source, @sell_value, @sort_order)
  `);

  const syncFields = db.prepare(`
    UPDATE arc_parts
    SET rarity = @rarity, source = @source, sell_value = @sell_value
    WHERE name = @name AND (rarity != @rarity OR source != @source OR sell_value != @sell_value)
  `);

  const upsertMany = db.transaction((parts) => {
    parts.forEach((p) => {
      insert.run({
        name: p.name,
        slug: slugify(p.name),
        rarity: p.rarity,
        source: p.source,
        sell_value: p.sell_value ?? 0,
        sort_order: p.sort_order,
      });
      syncFields.run({ name: p.name, rarity: p.rarity, source: p.source, sell_value: p.sell_value ?? 0 });
    });
  });

  const before = db.prepare('SELECT COUNT(*) as c FROM arc_parts').get().c;
  upsertMany(ARC_PARTS);
  const after = db.prepare('SELECT COUNT(*) as c FROM arc_parts').get().c;
  if (after > before) console.log(`Seeded ${after - before} new ARC part(s) (total: ${after})`);
}

function seedWorkshop() {
  const insertStation = db.prepare(`
    INSERT OR IGNORE INTO workshop_stations (name, slug, sort_order)
    VALUES (@name, @slug, @sort_order)
  `);
  const getStationByName = db.prepare('SELECT id FROM workshop_stations WHERE name = ?');

  const insertMaterial = db.prepare(`
    INSERT OR IGNORE INTO workshop_materials (name, slug, sort_order)
    VALUES (@name, @slug, @sort_order)
  `);
  const getMaterialByName = db.prepare('SELECT id FROM workshop_materials WHERE name = ?');
  const getArcPartByName = db.prepare('SELECT id FROM arc_parts WHERE name = ?');

  const insertRequirement = db.prepare(`
    INSERT OR IGNORE INTO workshop_requirements
      (station_id, level, item_type, item_id, qty_required, sort_order)
    VALUES (@station_id, @level, @item_type, @item_id, @qty_required, @sort_order)
  `);
  const syncRequirement = db.prepare(`
    UPDATE workshop_requirements SET qty_required = @qty_required
    WHERE station_id = @station_id AND level = @level AND item_type = @item_type AND item_id = @item_id
      AND qty_required != @qty_required
  `);

  let materialSortOrder = 0;

  const seedAll = db.transaction((stations) => {
    stations.forEach((station, sIdx) => {
      insertStation.run({ name: station.name, slug: slugify(station.name), sort_order: station.sort_order ?? sIdx * 10 });
      const stationRow = getStationByName.get(station.name);

      station.levels.forEach(({ level, materials }) => {
        materials.forEach((mat, mIdx) => {
          const arcPart = getArcPartByName.get(mat.name);
          let itemType;
          let itemId;

          if (arcPart) {
            itemType = 'arc_part';
            itemId = arcPart.id;
          } else {
            let materialRow = getMaterialByName.get(mat.name);
            if (!materialRow) {
              insertMaterial.run({ name: mat.name, slug: slugify(mat.name), sort_order: materialSortOrder++ });
              materialRow = getMaterialByName.get(mat.name);
            }
            itemType = 'material';
            itemId = materialRow.id;
          }

          const reqData = {
            station_id: stationRow.id,
            level,
            item_type: itemType,
            item_id: itemId,
            qty_required: mat.qty,
            sort_order: mIdx,
          };
          insertRequirement.run(reqData);
          syncRequirement.run(reqData);
        });
      });
    });
  });

  const before = db.prepare('SELECT COUNT(*) as c FROM workshop_requirements').get().c;
  seedAll(WORKSHOP_STATIONS);
  const after = db.prepare('SELECT COUNT(*) as c FROM workshop_requirements').get().c;
  if (after > before) console.log(`Seeded ${after - before} workshop requirement row(s)`);
}

function seedWeaponMods() {
  const insert = db.prepare(`
    INSERT OR IGNORE INTO weapon_mods
      (name, slug, slot, variant, craftable, blueprint_id, sell_value, sort_order)
    VALUES
      (@name, @slug, @slot, @variant, @craftable, @blueprint_id, @sell_value, @sort_order)
  `);

  // Backfill a seeded price onto rows that don't have one yet. This covers
  // databases seeded before prices were available, without touching a price
  // the user has already entered.
  const backfillValue = db.prepare(`
    UPDATE weapon_mods SET sell_value = @sell_value
    WHERE name = @name AND sell_value = 0 AND @sell_value != 0
  `);

  // Sync structural fields only. sell_value is user-editable — never overwrite it.
  const syncFields = db.prepare(`
    UPDATE weapon_mods
    SET slot = @slot, variant = @variant, craftable = @craftable,
        blueprint_id = @blueprint_id, sort_order = @sort_order
    WHERE name = @name
      AND (slot != @slot
           OR variant IS NOT @variant
           OR craftable != @craftable
           OR blueprint_id IS NOT @blueprint_id
           OR sort_order != @sort_order)
  `);

  const getBlueprintByName = db.prepare("SELECT id FROM blueprints WHERE name = ? AND category = 'mods'");
  const slotOrder = MOD_SLOTS.map(s => s.slot);

  const upsertMany = db.transaction((mods) => {
    mods.forEach((mod, i) => {
      // Craftable mods point back at their blueprint row so the app treats a
      // mod and its blueprint as one item. Tier I mods are craftable in game
      // but have no blueprint seeded, so the lookup simply misses and the
      // reference stays NULL — which is correct, not an error.
      const blueprint = mod.craftable ? getBlueprintByName.get(mod.name) : null;
      const row = {
        name: mod.name,
        slug: slugify(mod.name),
        slot: mod.slot,
        variant: mod.variant ?? null,
        craftable: mod.craftable ? 1 : 0,
        blueprint_id: blueprint ? blueprint.id : null,
        sell_value: mod.value ?? 0,
        sort_order: slotOrder.indexOf(mod.slot) * 100 + i,
      };
      insert.run(row);
      syncFields.run(row);
      backfillValue.run(row);
    });
  });

  const before = db.prepare('SELECT COUNT(*) as c FROM weapon_mods').get().c;
  upsertMany(WEAPON_MODS);
  const after = db.prepare('SELECT COUNT(*) as c FROM weapon_mods').get().c;
  if (after > before) console.log(`Seeded ${after - before} new weapon mod(s) (total: ${after})`);
}

function seedWeapons() {
  const insert = db.prepare(`
    INSERT OR IGNORE INTO weapons
      (name, slug, class, rarity, gunsmith_level, tiered, blueprint_id, sort_order)
    VALUES
      (@name, @slug, @class, @rarity, @gunsmith_level, @tiered, @blueprint_id, @sort_order)
  `);

  const sync = db.prepare(`
    UPDATE weapons
    SET class = @class, rarity = @rarity, gunsmith_level = @gunsmith_level,
        tiered = @tiered, blueprint_id = @blueprint_id, sort_order = @sort_order
    WHERE name = @name
  `);

  const getBlueprintByName = db.prepare("SELECT id FROM blueprints WHERE name = ? AND category = 'weapons'");

  const upsertMany = db.transaction((weapons) => {
    weapons.forEach((weapon, i) => {
      // Seven weapons are Gunsmith-unlocked and have no blueprint; the lookup
      // simply misses for those and blueprint_id stays NULL, which is correct.
      const blueprint = getBlueprintByName.get(weapon.name);
      const row = {
        name: weapon.name,
        slug: slugify(weapon.name),
        class: weapon.class,
        rarity: weapon.rarity ?? null,
        gunsmith_level: weapon.gunsmith_level ?? null,
        tiered: weapon.tiered ? 1 : 0,
        blueprint_id: blueprint ? blueprint.id : null,
        sort_order: WEAPON_CLASSES.indexOf(weapon.class) * 100 + i,
      };
      insert.run(row);
      sync.run(row);
    });
  });

  const before = db.prepare('SELECT COUNT(*) as c FROM weapons').get().c;
  upsertMany(WEAPONS);
  const after = db.prepare('SELECT COUNT(*) as c FROM weapons').get().c;
  if (after > before) console.log(`Seeded ${after - before} new weapon(s) (total: ${after})`);
}

/**
 * Moves gun_configs and weapon_prices off blueprint_id and onto weapon_id.
 *
 * Databases created by v1.4.x reference blueprints directly, which cannot
 * express the seven Gunsmith-unlocked weapons. Both tables are rebuilt rather
 * than altered, because SQLite cannot retarget a foreign key in place.
 *
 * Must run after seedWeapons(), since the mapping goes through weapons.blueprint_id.
 */
function migrateToWeaponCatalog() {
  const configCols = db.pragma('table_info(gun_configs)').map(c => c.name);
  const priceCols = db.pragma('table_info(weapon_prices)').map(c => c.name);
  const configNeedsMigration = configCols.includes('blueprint_id');
  const priceNeedsMigration = priceCols.includes('blueprint_id');
  if (!configNeedsMigration && !priceNeedsMigration) return;

  // Foreign keys must be disabled outside a transaction, and the table swap
  // would otherwise trip the gun_config_mods cascade.
  db.pragma('foreign_keys = OFF');
  try {
    db.transaction(() => {
      if (configNeedsMigration) {
        db.exec(`
          CREATE TABLE gun_configs_migrated (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            character_id  INTEGER NOT NULL,
            weapon_id     INTEGER NOT NULL,
            name          TEXT,
            tier          INTEGER CHECK (tier IS NULL OR (tier >= 1 AND tier <= 4)),
            quantity      INTEGER DEFAULT 0,
            weapon_value  INTEGER DEFAULT 0,
            notes         TEXT,
            created_at    TEXT    DEFAULT (datetime('now')),
            updated_at    TEXT    DEFAULT (datetime('now')),
            FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE,
            FOREIGN KEY (weapon_id)    REFERENCES weapons(id)
          );

          -- Ids are preserved so gun_config_mods keeps pointing at the right
          -- builds. The join is an inner join on purpose: every weapon
          -- blueprint has a catalog row, so a build that failed to map would
          -- indicate a seed problem, and silently keeping it with a dangling
          -- reference would be worse than losing it loudly in testing.
          INSERT INTO gun_configs_migrated
            (id, character_id, weapon_id, name, tier, quantity, weapon_value, notes, created_at, updated_at)
          SELECT gc.id, gc.character_id, w.id, gc.name, gc.tier, gc.quantity,
                 gc.weapon_value, gc.notes, gc.created_at, gc.updated_at
          FROM gun_configs gc
          JOIN weapons w ON w.blueprint_id = gc.blueprint_id;

          DROP TABLE gun_configs;
          ALTER TABLE gun_configs_migrated RENAME TO gun_configs;
          CREATE INDEX IF NOT EXISTS idx_gun_configs_char ON gun_configs(character_id);
        `);
      }

      if (priceNeedsMigration) {
        // Pure seed data — rebuilt empty and re-seeded rather than mapped.
        db.exec(`
          DROP TABLE weapon_prices;
          CREATE TABLE weapon_prices (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            weapon_id  INTEGER NOT NULL,
            tier       INTEGER NOT NULL,
            sell_value INTEGER NOT NULL,
            FOREIGN KEY (weapon_id) REFERENCES weapons(id),
            UNIQUE(weapon_id, tier)
          );
        `);
      }
    })();
  } finally {
    db.pragma('foreign_keys = ON');
  }

  const orphans = db.prepare(`
    SELECT COUNT(*) as c FROM gun_config_mods gcm
    LEFT JOIN gun_configs gc ON gc.id = gcm.config_id
    WHERE gc.id IS NULL
  `).get().c;
  if (orphans > 0) {
    db.prepare(`
      DELETE FROM gun_config_mods
      WHERE config_id NOT IN (SELECT id FROM gun_configs)
    `).run();
    console.warn(`Migration: removed ${orphans} mod row(s) whose build did not map to a weapon.`);
  }

  console.log('Migrated gun configs and weapon prices to the weapon catalog.');
}

function seedWeaponPrices() {
  const insert = db.prepare(`
    INSERT OR IGNORE INTO weapon_prices (weapon_id, tier, sell_value)
    VALUES (@weapon_id, @tier, @sell_value)
  `);

  // Prices are reference data, so corrections to the seed propagate. Nothing
  // in the app writes here — a build keeps its own weapon_value.
  const sync = db.prepare(`
    UPDATE weapon_prices SET sell_value = @sell_value
    WHERE weapon_id = @weapon_id AND tier = @tier AND sell_value != @sell_value
  `);

  const getWeaponByName = db.prepare('SELECT id FROM weapons WHERE name = ?');

  const seedAll = db.transaction((weapons) => {
    for (const weapon of weapons) {
      const row = getWeaponByName.get(weapon.name);
      if (!row) continue; // weapon not in the blueprint seed — skip rather than fail

      const entries = weapon.tiers
        ? weapon.tiers.map((sell_value, i) => ({ tier: i + 1, sell_value }))
        : [{ tier: 0, sell_value: weapon.flat }];

      for (const entry of entries) {
        const data = { weapon_id: row.id, ...entry };
        insert.run(data);
        sync.run(data);
      }
    }
  });

  const before = db.prepare('SELECT COUNT(*) as c FROM weapon_prices').get().c;
  seedAll(WEAPON_PRICES);
  const after = db.prepare('SELECT COUNT(*) as c FROM weapon_prices').get().c;
  if (after > before) console.log(`Seeded ${after - before} weapon price row(s) (total: ${after})`);
}

function runMigrations() {
  const charCols = db.pragma('table_info(characters)').map(c => c.name);
  if (!charCols.includes('nomad_stash')) {
    db.exec('ALTER TABLE characters ADD COLUMN nomad_stash INTEGER DEFAULT 0');
  }

  const arcCols = db.pragma('table_info(arc_parts)').map(c => c.name);
  if (!arcCols.includes('sell_value')) {
    db.exec('ALTER TABLE arc_parts ADD COLUMN sell_value INTEGER DEFAULT 0');
  }

  if (!charCols.includes('parent_id')) {
    db.exec('ALTER TABLE characters ADD COLUMN parent_id INTEGER REFERENCES characters(id) ON DELETE SET NULL');
  }

  const updatedCharCols = db.pragma('table_info(characters)').map(c => c.name);
  if (updatedCharCols.includes('parent_id')) {
    db.exec('CREATE INDEX IF NOT EXISTS idx_characters_parent ON characters(parent_id)');
  }
}

initSchema();
runMigrations();
seedBlueprints();
seedArcParts();
seedWorkshop();
seedWeaponMods();
// Order matters: the catalog must exist before builds can be pointed at it,
// and prices are keyed by catalog id.
seedWeapons();
migrateToWeaponCatalog();
seedWeaponPrices();

module.exports = db;
