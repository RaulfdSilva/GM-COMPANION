import type { AppDatabase } from './connection.ts';
export const MIGRATIONS = [
  { version: 1, sql: `
    CREATE TABLE campaigns (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL CHECK(length(trim(name)) > 0),
      level INTEGER NOT NULL CHECK(level BETWEEN 1 AND 20),
      created_at TEXT NOT NULL
    );
    CREATE TABLE characters (
      id TEXT PRIMARY KEY NOT NULL,
      campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
      name TEXT NOT NULL CHECK(length(trim(name)) > 0)
    );
    CREATE TABLE treasure_awards (
      id TEXT PRIMARY KEY NOT NULL,
      campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
      item_id TEXT NOT NULL,
      item_name TEXT NOT NULL CHECK(length(trim(item_name)) > 0),
      rarity TEXT NOT NULL CHECK(rarity IN ('common','uncommon','rare','veryRare','legendary','artifact')),
      variant_label TEXT,
      value_copper INTEGER CHECK(value_copper IS NULL OR value_copper >= 0),
      party_level INTEGER NOT NULL CHECK(party_level BETWEEN 1 AND 20),
      awarded_at TEXT NOT NULL,
      notes TEXT NOT NULL DEFAULT ''
    );
    CREATE INDEX awards_campaign_date ON treasure_awards(campaign_id, awarded_at DESC);
  ` },
  { version: 2, sql: `
    CREATE TABLE imported_catalogs (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      payload TEXT NOT NULL,
      imported_at TEXT NOT NULL
    );
  ` },
] as const;
export async function migrateDatabase(database: AppDatabase): Promise<void> {
  await database.execAsync('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;');
  await database.transaction(async (connection) => {
    const current = await connection.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
    const version = current?.user_version ?? 0;
    if (version > MIGRATIONS.length) throw new Error('Banco criado por uma versão mais recente do aplicativo.');
    for (const migration of MIGRATIONS) {
      if (migration.version <= version) continue;
      await connection.execAsync(migration.sql);
      await connection.execAsync(`PRAGMA user_version = ${migration.version}`);
    }
  });
}
