import { isPartyLevel } from '../../../shared/rules/party-level.ts';
import { failure, success } from '../../../shared/types/result.ts';
import type { Result } from '../../../shared/types/result.ts';
import { RARITIES } from './models.ts';
import type { Rarity } from './models.ts';
export const LEVEL_BANDS = [
  { min: 1, max: 4, probabilities: [54, 37, 9, 0, 0], progression: [6, 4, 1, 0, 0] },
  { min: 5, max: 10, probabilities: [30, 51, 17, 2, 0], progression: [10, 17, 6, 1, 0] },
  { min: 11, max: 16, probabilities: [11, 23, 36, 23, 7], progression: [3, 7, 11, 7, 2] },
  { min: 17, max: 20, probabilities: [0, 0, 20, 44, 36], progression: [0, 0, 5, 11, 9] },
] as const;
export const COPPER_PER_GOLD = 100;
export const REFERENCE_COPPER: Readonly<Record<Rarity, number>> = {
  common: 100 * COPPER_PER_GOLD,
  uncommon: 400 * COPPER_PER_GOLD,
  rare: 4000 * COPPER_PER_GOLD,
  veryRare: 40000 * COPPER_PER_GOLD,
  legendary: 200000 * COPPER_PER_GOLD,
};
export type RandomSource = () => number;
export const levelBand = (level: number) =>
  isPartyLevel(level)
    ? LEVEL_BANDS.find((band) => level >= band.min && level <= band.max)
    : undefined;
export function rollDie(sides: number, random: RandomSource): Result<number> {
  if (!Number.isSafeInteger(sides) || sides < 1)
    return failure('validation', 'O dado deve ter um número inteiro positivo de faces.');
  const value = random();
  if (!Number.isFinite(value) || value < 0 || value >= 1)
    return failure(
      'validation',
      'Fonte aleatória inválida: esperado um valor entre 0 (inclusivo) e 1 (exclusivo).',
    );
  return success(Math.floor(value * sides) + 1);
}
export function selectRarity(level: number, random: RandomSource): Result<Rarity> {
  const band = levelBand(level);
  if (!band) return failure('validation', 'O nível deve ser um inteiro entre 1 e 20.');
  const roll = rollDie(100, random);
  if (!roll.ok) return roll;
  let cumulative = 0;
  for (const [index, rarity] of RARITIES.entries()) {
    cumulative += band.probabilities[index] ?? 0;
    if (roll.value <= cumulative) return success(rarity);
  }
  return failure('validation', 'Distribuição de raridade inválida.');
}
