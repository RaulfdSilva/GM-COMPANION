import { failure } from '../../../shared/types/result.ts';
import type { Result } from '../../../shared/types/result.ts';
import { parseGoldInput } from './money.ts';
import { CATEGORIES } from '../domain/models.ts';
import type { ItemCategory, Rarity, TreasureGenerationConfig, TreasureTheme } from '../domain/models.ts';
import { validateGenerationConfig } from '../domain/generator.ts';
export type GeneratorForm = Readonly<{
  level: string; quantity: string; rarityMode: 'automatic' | 'manual'; manualRarity: Rarity;
  theme: TreasureTheme; mode: 'faithful' | 'custom'; categories: readonly ItemCategory[];
  maxGold: string; unknownValuePolicy: 'exclude' | 'allowWithWarning';
}>;
export function buildGenerationConfig(form: GeneratorForm): Result<TreasureGenerationConfig> {
  if (!/^\d+$/.test(form.level.trim()) || !/^\d+$/.test(form.quantity.trim()))
    return failure('validation', 'Nível e quantidade devem ser números inteiros.');
  const budget = form.mode === 'faithful' ? { ok: true as const, value: null } : parseGoldInput(form.maxGold);
  if (!budget.ok) return budget;
  return validateGenerationConfig({ level: Number(form.level), quantity: Number(form.quantity),
    rarity: form.rarityMode === 'automatic' ? { mode: 'automatic' } : { mode: 'manual', value: form.manualRarity },
    theme: form.theme, mode: form.mode, categories: form.mode === 'faithful' ? CATEGORIES : form.categories,
    maxValueCopper: budget.value, unknownValuePolicy: form.unknownValuePolicy });
}
