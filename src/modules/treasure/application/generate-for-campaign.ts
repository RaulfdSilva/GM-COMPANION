import type { Campaign } from '../../campaigns/domain/models.ts';
import type { Result } from '../../../shared/types/result.ts';
import { success } from '../../../shared/types/result.ts';
import { generateTreasure } from '../domain/generator.ts';
import type { GenerationDependencies } from '../domain/generator.ts';
import { assessReward } from '../domain/balance.ts';
import type { BalanceAssessment, GeneratedTreasure, TreasureAward, TreasureCatalog, TreasureGenerationConfig } from '../domain/models.ts';
export type GenerationView = Readonly<{ treasure: GeneratedTreasure; assessments: Readonly<Record<string, BalanceAssessment>>; campaignId: string }>;
export function generateForCampaign(input: Readonly<{
  campaign: Campaign; catalog: TreasureCatalog; config: TreasureGenerationConfig;
  history: readonly TreasureAward[] | null;
}>, dependencies: GenerationDependencies): Result<GenerationView> {
  const generated = generateTreasure(input.catalog, input.config, dependencies);
  if (!generated.ok) return generated;
  const assessments: Record<string, BalanceAssessment> = {};
  for (const item of generated.value.items) {
    assessments[item.id] = assessReward({ level: input.config.level, rarity: item.rarity, history: input.history?.filter((award) => award.campaignId === input.campaign.id) ?? null,
      partySize: input.campaign.party.characters.length,
      proposedCount: generated.value.items.filter((candidate) => candidate.rarity === item.rarity).length });
  }
  return success({ treasure: generated.value, assessments, campaignId: input.campaign.id });
}
