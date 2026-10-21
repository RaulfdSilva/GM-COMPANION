import type { AppServices } from '../application/app-services';
import { openAppDatabase } from '../database/expo-database';
import { createCampaignRepository } from '../modules/campaigns/infrastructure/sqlite-campaign-repository';
import {
  importCatalog,
  importCatalogText,
} from '../modules/treasure/infrastructure/catalog-importer';
import { createAwardRepository } from '../modules/treasure/infrastructure/sqlite-award-repository';
import { createCatalogRepository } from '../modules/treasure/infrastructure/sqlite-catalog-repository';
import demo from '../modules/treasure/infrastructure/data/demo-catalog.json';
import { errorMessage, failure, success } from '../shared/types/result';
import type { Result } from '../shared/types/result';

export async function openAppServices(): Promise<Result<AppServices>> {
  const parsed = importCatalog(demo);
  if (!parsed.ok) return parsed;
  try {
    const database = await openAppDatabase();
    return success({
      campaigns: createCampaignRepository(database),
      awards: createAwardRepository(database),
      catalogs: createCatalogRepository(database),
      originalCatalog: { id: 'demo', name: 'Demonstração original • CC0', catalog: parsed.value },
      parseCatalog: importCatalogText,
      close: () => database.closeAsync(),
    });
  } catch (cause) {
    return failure(
      'persistence',
      'Não foi possível abrir o banco. Os dados existentes foram preservados.',
      [errorMessage(cause)],
    );
  }
}
