import { DatabaseSync } from 'node:sqlite';
import type { AppDatabase, SqlConnection, SqlValue } from '../src/database/connection.ts';
export function openNodeDatabase(path = ':memory:'): AppDatabase & { close(): void } {
  const sqlite = new DatabaseSync(path);
  const connection: SqlConnection = {
    async execAsync(sql) { sqlite.exec(sql); },
    async runAsync(sql, ...params) { return { changes: Number(sqlite.prepare(sql).run(...params).changes) }; },
    async getAllAsync<T>(sql: string, ...params: SqlValue[]) { return sqlite.prepare(sql).all(...params) as T[]; },
    async getFirstAsync<T>(sql: string, ...params: SqlValue[]) { return (sqlite.prepare(sql).get(...params) as T | undefined) ?? null; },
  };
  return { ...connection, close: () => sqlite.close(), async transaction<T>(work: (transaction: SqlConnection) => Promise<T>) {
    sqlite.exec('BEGIN IMMEDIATE');
    try { const result = await work(connection); sqlite.exec('COMMIT'); return result; }
    catch (error) { sqlite.exec('ROLLBACK'); throw error; }
  } };
}
