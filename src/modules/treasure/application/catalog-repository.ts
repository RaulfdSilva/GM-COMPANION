import type { Result } from '../../../shared/types/result.ts';
import type { TreasureCatalog } from '../domain/models.ts';

export const MAX_CATALOG_BYTES = 2_000_000;

export type StoredCatalog = Readonly<{ id: string; name: string; catalog: TreasureCatalog }>;

export interface CatalogRepository {
  list(): Promise<Result<readonly StoredCatalog[]>>;
  save(record: StoredCatalog): Promise<Result<StoredCatalog>>;
}
