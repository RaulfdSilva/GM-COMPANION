import type { Campaign } from '../domain/models.ts';
import type { Result } from '../../../shared/types/result.ts';
import { failure } from '../../../shared/types/result.ts';
import { levelBand } from '../../treasure/domain/rules.ts';
export interface CampaignRepository {
  list(): Promise<Result<readonly Campaign[]>>;
  save(campaign: Campaign): Promise<Result<Campaign>>;
}
export function validateCampaign(campaign: Campaign): Result<never> | null {
  if (!campaign.id.trim() || !campaign.name.trim() || campaign.name.length > 120)
    return failure('validation', 'Informe um nome de campanha com até 120 caracteres.');
  if (!levelBand(campaign.party.level)) return failure('validation', 'O nível do grupo deve estar entre 1 e 20.');
  if (!Number.isFinite(Date.parse(campaign.createdAt))) return failure('validation', 'Data da campanha inválida.');
  if (campaign.party.characters.length > 100 || campaign.party.characters.some((character) => !character.id.trim() || !character.name.trim() || character.name.length > 120))
    return failure('validation', 'Revise os nomes dos personagens (até 120 caracteres).');
  if (new Set(campaign.party.characters.map((character) => character.id)).size !== campaign.party.characters.length)
    return failure('validation', 'Personagens com IDs duplicados.');
  return null;
}
export async function saveCampaign(repository: CampaignRepository, campaign: Campaign): Promise<Result<Campaign>> {
  const validation = validateCampaign(campaign);
  return validation ?? repository.save(campaign);
}
