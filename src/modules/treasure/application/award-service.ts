import { failure } from '../../../shared/types/result.ts';
import type { Result } from '../../../shared/types/result.ts';
import { RARITIES } from '../domain/models.ts';
import type { GeneratedItem, TreasureAward } from '../domain/models.ts';
import { levelBand } from '../domain/rules.ts';
export interface AwardRepository {
  list(campaignId: string): Promise<Result<readonly TreasureAward[]>>;
  add(awards: readonly TreasureAward[]): Promise<Result<void>>;
  update(award: TreasureAward): Promise<Result<void>>;
  remove(id: string, campaignId: string): Promise<Result<void>>;
}
export function validateAward(award: TreasureAward): Result<never> | null {
  if (!award.id || !award.campaignId || !award.itemId || !award.itemName.trim() || award.itemName.length > 200)
    return failure('validation', 'Dados da recompensa incompletos.');
  if (!levelBand(award.partyLevel) || ![...RARITIES, 'artifact'].includes(award.rarity))
    return failure('validation', 'Nível ou raridade inválidos.');
  if (award.valueCopper !== null && (!Number.isSafeInteger(award.valueCopper) || award.valueCopper < 0))
    return failure('validation', 'Valor monetário inválido.');
  if (!Number.isFinite(Date.parse(award.awardedAt)) || award.notes.length > 2000)
    return failure('validation', 'Data ou observações inválidas.');
  return null;
}
export function createAward(item: GeneratedItem, context: Readonly<{ id: string; campaignId: string; partyLevel: number; now: string }>): TreasureAward {
  return { id: context.id, campaignId: context.campaignId, itemId: item.item.id, itemName: item.item.name,
    rarity: item.rarity, variantLabel: item.variant?.label ?? null, valueCopper: item.value.kind === 'known' ? item.value.copper : null,
    partyLevel: context.partyLevel, awardedAt: context.now, notes: '' };
}
export function rarityTotals(awards: readonly TreasureAward[]): Readonly<Record<string, number>> {
  const totals: Record<string, number> = {};
  for (const award of awards) totals[award.rarity] = (totals[award.rarity] ?? 0) + 1;
  return totals;
}
