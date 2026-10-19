import type { AppDatabase } from '../../../database/connection.ts';
import { errorMessage, failure, success } from '../../../shared/types/result.ts';
import type { Campaign } from '../domain/models.ts';
import type { CampaignRepository } from '../application/campaign-service.ts';
import { validateCampaign } from '../application/campaign-service.ts';
type CampaignRow = { id: string; name: string; level: number; created_at: string };
export function createCampaignRepository(database: AppDatabase): CampaignRepository {
  return {
    async list() {
      try {
        const rows = await database.getAllAsync<CampaignRow>('SELECT * FROM campaigns ORDER BY created_at, id');
        const campaigns = await Promise.all(rows.map(async (row): Promise<Campaign> => ({
          id: row.id, name: row.name, createdAt: row.created_at,
          party: { level: row.level, characters: await database.getAllAsync<{ id: string; name: string }>('SELECT id, name FROM characters WHERE campaign_id = ? ORDER BY rowid', row.id).then((characters) => characters.map((character) => ({ id: character.id, name: character.name }))) },
        })));
        return success(campaigns);
      } catch (error) { return failure('persistence', 'Não foi possível carregar as campanhas.', [errorMessage(error)]); }
    },
    async save(campaign) {
      const validation = validateCampaign(campaign);
      if (validation) return validation;
      try {
        await database.transaction(async (connection) => {
          await connection.runAsync('INSERT INTO campaigns (id,name,level,created_at) VALUES (?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name, level=excluded.level', campaign.id, campaign.name.trim(), campaign.party.level, campaign.createdAt);
          await connection.runAsync('DELETE FROM characters WHERE campaign_id = ?', campaign.id);
          for (const character of campaign.party.characters)
            await connection.runAsync('INSERT INTO characters (id,campaign_id,name) VALUES (?,?,?)', character.id, campaign.id, character.name.trim());
        });
        return success(campaign);
      } catch (error) { return failure('persistence', 'Não foi possível salvar a campanha.', [errorMessage(error)]); }
    },
  };
}
