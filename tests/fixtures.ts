import demo from '../src/modules/treasure/infrastructure/data/demo-catalog.json' with { type: 'json' };
import type { Campaign } from '../src/modules/campaigns/domain/models.ts';
import { CATEGORIES } from '../src/modules/treasure/domain/models.ts';
import type { MagicItem, TreasureAward, TreasureCatalog, TreasureGenerationConfig } from '../src/modules/treasure/domain/models.ts';
import type { GenerationDependencies } from '../src/modules/treasure/domain/generator.ts';
export const catalog = demo as TreasureCatalog;
export const item = catalog.items[0] as MagicItem;
export const configuration: TreasureGenerationConfig = { level: 1, rarity: { mode: 'manual', value: 'common' }, theme: 'Arcana', mode: 'custom', categories: CATEGORIES, maxValueCopper: null, unknownValuePolicy: 'exclude', quantity: 1 };
export function dependencies(values: readonly number[] = [0]): GenerationDependencies {
  let index = 0;
  let id = 0;
  return { random: () => values[index++ % values.length] ?? 0, id: () => `generated-${++id}`, now: () => '2026-10-19T00:00:00.000Z' };
}
export const campaign: Campaign = { id: 'campaign-1', name: 'Campanha teste', party: { level: 1, characters: [{ id: 'hero-1', name: 'Ari' }] }, createdAt: '2026-10-19T00:00:00.000Z' };
export const award: TreasureAward = { id: 'award-1', campaignId: campaign.id, itemId: item.id, itemName: item.name, rarity: item.rarity, valueCopper: 5000, variantLabel: null, partyLevel: 1, awardedAt: campaign.createdAt, notes: '' };
