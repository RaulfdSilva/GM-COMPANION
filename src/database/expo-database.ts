import { openDatabaseAsync } from 'expo-sqlite';
import { errorMessage } from '../shared/types/result.ts';
import type { AppDatabase } from './connection.ts';
import { migrateDatabase } from './migrations.ts';
import { createSqliteDatabase } from './sqlite-database.ts';

export async function openAppDatabase(): Promise<AppDatabase> {
  const openConnection = () => openDatabaseAsync('dm-companion.db', { useNewConnection: true });
  const main = await openConnection();
  const database = createSqliteDatabase(main, openConnection);
  try {
    await migrateDatabase(database);
    return database;
  } catch (cause) {
    try {
      await database.closeAsync();
    } catch (closeError) {
      throw new Error(`Abertura: ${errorMessage(cause)}; fechamento: ${errorMessage(closeError)}`);
    }
    throw cause;
  }
}
