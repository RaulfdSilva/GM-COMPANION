import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AppDatabase, SqlValue } from '../src/database/connection.ts';
import { createSqliteDatabase } from '../src/database/sqlite-database.ts';
import type { ClosableSqlConnection } from '../src/database/sqlite-database.ts';

export function openNodeDatabase(path?: string): AppDatabase & { close(): void } {
  const folder = path ? null : mkdtempSync(join(tmpdir(), 'gm-companion-sqlite-'));
  const filename = path ?? join(folder ?? tmpdir(), 'test.db');
  const main = new DatabaseSync(filename);
  function adapt(sqlite: DatabaseSync): ClosableSqlConnection {
    return {
      async execAsync(sql) { sqlite.exec(sql); },
      async runAsync(sql, ...params) {
        return { changes: Number(sqlite.prepare(sql).run(...params).changes) };
      },
      async getAllAsync<T>(sql: string, ...params: SqlValue[]) {
        return sqlite.prepare(sql).all(...params) as T[];
      },
      async getFirstAsync<T>(sql: string, ...params: SqlValue[]) {
        return (sqlite.prepare(sql).get(...params) as T | undefined) ?? null;
      },
      async closeAsync() { sqlite.close(); },
    };
  }
  const database = createSqliteDatabase(adapt(main), async () => adapt(new DatabaseSync(filename)));
  let closed = false;
  function close() {
    if (closed) return;
    main.close();
    if (folder) rmSync(folder, { recursive: true, force: true });
    closed = true;
  }
  return { ...database, close, async closeAsync() { close(); } };
}
