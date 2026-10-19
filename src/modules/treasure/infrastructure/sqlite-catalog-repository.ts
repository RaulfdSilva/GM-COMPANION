import type { AppDatabase } from '../../../database/connection.ts';
import type { Result } from '../../../shared/types/result.ts';
import { errorMessage, failure, success } from '../../../shared/types/result.ts';
import type { TreasureCatalog } from '../domain/models.ts';
import { importCatalog, importCatalogText } from './catalog-importer.ts';
export type StoredCatalog = Readonly<{ id: string; name: string; catalog: TreasureCatalog }>;
export function createCatalogRepository(database: AppDatabase) {
  return {
    async list(): Promise<Result<readonly StoredCatalog[]>> {
      try {
        const rows = await database.getAllAsync<{ id: string; name: string; payload: string }>('SELECT id, name, payload FROM imported_catalogs ORDER BY imported_at');
        const result: StoredCatalog[] = [];
        for (const row of rows) {
          const parsed = importCatalogText(row.payload);
          if (!parsed.ok) return failure('validation', `Catálogo salvo inválido: ${row.name}.`, parsed.error.details);
          result.push({ id: row.id, name: row.name, catalog: parsed.value });
        }
        return success(result);
      } catch (error) { return failure('persistence', 'Não foi possível carregar os catálogos importados.', [errorMessage(error)]); }
    },
    async save(record: StoredCatalog): Promise<Result<StoredCatalog>> {
      const validation = importCatalog(record.catalog);
      if (!validation.ok) return validation;
      if (!record.id || !record.name.trim() || record.name.length > 200) return failure('validation', 'Nome de catálogo inválido.');
      try {
        await database.runAsync('INSERT INTO imported_catalogs (id,name,payload,imported_at) VALUES (?,?,?,?)', record.id, record.name, JSON.stringify(validation.value), new Date().toISOString());
        return success({ ...record, catalog: validation.value });
      } catch (error) { return failure('persistence', 'Não foi possível salvar o catálogo.', [errorMessage(error)]); }
    },
  };
}
