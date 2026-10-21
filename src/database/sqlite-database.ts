import { errorMessage } from '../shared/types/result.ts';
import type { AppDatabase, SqlConnection, SqlValue } from './connection.ts';

export interface ClosableSqlConnection extends SqlConnection {
  closeAsync(): Promise<void>;
}

type TransactionOutcome<T> = { ok: true; value: T } | { ok: false; cause: unknown };
const CONNECTION_PRAGMAS = 'PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;';

async function executeTransaction<T>(
  connection: SqlConnection,
  work: (connection: SqlConnection) => Promise<T>,
): Promise<T> {
  // foreign_keys is connection-local and cannot be enabled inside a transaction.
  await connection.execAsync(CONNECTION_PRAGMAS);
  await connection.execAsync('BEGIN IMMEDIATE');
  try {
    const value = await work(connection);
    await connection.execAsync('COMMIT');
    return value;
  } catch (cause) {
    try {
      await connection.execAsync('ROLLBACK');
    } catch (rollbackError) {
      throw new Error(`Falha: ${errorMessage(cause)}; rollback: ${errorMessage(rollbackError)}`);
    }
    throw cause;
  }
}

/** Owns each transaction connection, keeping unrelated async work outside it. */
export function createSqliteDatabase(
  main: ClosableSqlConnection,
  openConnection: () => Promise<ClosableSqlConnection>,
): AppDatabase {
  return {
    execAsync: (sql) => main.execAsync(sql),
    runAsync: (sql, ...params) => main.runAsync(sql, ...params),
    getAllAsync: <T>(sql: string, ...params: SqlValue[]) => main.getAllAsync<T>(sql, ...params),
    getFirstAsync: <T>(sql: string, ...params: SqlValue[]) => main.getFirstAsync<T>(sql, ...params),
    closeAsync: () => main.closeAsync(),
    async transaction<T>(work: (connection: SqlConnection) => Promise<T>): Promise<T> {
      const connection = await openConnection();
      let outcome: TransactionOutcome<T>;
      try {
        outcome = { ok: true, value: await executeTransaction(connection, work) };
      } catch (cause) {
        outcome = { ok: false, cause };
      }
      try {
        await connection.closeAsync();
      } catch (closeError) {
        const context = outcome.ok
          ? 'A transação foi confirmada'
          : `Falha: ${errorMessage(outcome.cause)}`;
        throw new Error(`${context}; fechamento da conexão: ${errorMessage(closeError)}`);
      }
      if (!outcome.ok) throw outcome.cause;
      return outcome.value;
    },
  };
}
