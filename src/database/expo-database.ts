import { openDatabaseAsync } from 'expo-sqlite';
import type { AppDatabase, SqlConnection } from './connection.ts';
import { migrateDatabase } from './migrations.ts';
export async function openAppDatabase(): Promise<AppDatabase> {
  const sqlite = await openDatabaseAsync('dm-companion.db');
  const database: AppDatabase = {
    execAsync: (sql) => sqlite.execAsync(sql),
    runAsync: (sql, ...params) => sqlite.runAsync(sql, ...params),
    getAllAsync: <T>(sql: string, ...params: (string | number | null)[]) => sqlite.getAllAsync<T>(sql, ...params),
    getFirstAsync: <T>(sql: string, ...params: (string | number | null)[]) => sqlite.getFirstAsync<T>(sql, ...params),
    async transaction<T>(work: (connection: SqlConnection) => Promise<T>): Promise<T> {
      let result: T | undefined;
      await sqlite.withExclusiveTransactionAsync(async (transaction) => {
        result = await work(transaction);
      });
      return result as T;
    },
  };
  await migrateDatabase(database);
  return database;
}
