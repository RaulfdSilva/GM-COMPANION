import type { CampaignRepository } from '../modules/campaigns/application/campaign-service.ts';
import type { AwardRepository } from '../modules/treasure/application/award-service.ts';
import type { CatalogRepository, StoredCatalog } from '../modules/treasure/application/catalog-repository.ts';
import type { TreasureCatalog } from '../modules/treasure/domain/models.ts';
import type { Result } from '../shared/types/result.ts';

export type AppServices = Readonly<{
  campaigns: CampaignRepository;
  awards: AwardRepository;
  catalogs: CatalogRepository;
  originalCatalog: StoredCatalog;
  parseCatalog: (text: string) => Result<TreasureCatalog>;
  close: () => Promise<void>;
}>;

export type OpenAppServices = () => Promise<Result<AppServices>>;
