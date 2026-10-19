import { failure, success } from '../../../shared/types/result.ts';
import type { Result } from '../../../shared/types/result.ts';
import { normalizeTimestamp } from '../../../shared/utils/timestamp.ts';
import { validateCatalog } from './catalog-validation.ts';
import { calculateItemValue } from './economy.ts';
import { CATEGORIES, RARITIES, THEMES } from './models.ts';
import type {
  GeneratedItem, GeneratedTreasure, ItemTarget, MagicItem, Rarity,
  TreasureCatalog, TreasureGenerationConfig, TreasureTable,
} from './models.ts';
import { levelBand, rollDie, selectRarity } from './rules.ts';
import type { RandomSource } from './rules.ts';

type Candidate = Readonly<{ item: MagicItem; target: ItemTarget; weight: number }>;
type Draw = Readonly<{ candidate: Candidate; rolls: readonly number[] }>;
export const MAX_RESULTS = 100;
export type GenerationDependencies = Readonly<{
  random: RandomSource;
  id: () => string;
  now: () => string;
}>;

export function validateGenerationConfig(config: TreasureGenerationConfig): Result<TreasureGenerationConfig> {
  if (!['faithful', 'custom'].includes(config.mode)
    || !['automatic', 'manual'].includes(config.rarity.mode)
    || !['exclude', 'allowWithWarning'].includes(config.unknownValuePolicy)) {
    return failure('validation', 'Modo de sorteio, raridade ou política de valor desconhecido inválidos.');
  }
  if (!levelBand(config.level)) return failure('validation', 'O nível deve ser um inteiro entre 1 e 20.');
  if (!Number.isInteger(config.quantity) || config.quantity < 1 || config.quantity > MAX_RESULTS) {
    return failure('validation', `Escolha entre 1 e ${MAX_RESULTS} resultados.`);
  }
  if (!THEMES.includes(config.theme)
    || (config.rarity.mode === 'manual' && !RARITIES.includes(config.rarity.value))) {
    return failure('validation', 'Tema ou raridade inválida.');
  }
  if (!config.categories.length || config.categories.some((category) => !CATEGORIES.includes(category))) {
    return failure('validation', 'Selecione ao menos uma categoria válida.');
  }
  if (new Set(config.categories).size !== config.categories.length) {
    return failure('validation', 'As categorias não podem estar duplicadas.');
  }
  if (config.maxValueCopper !== null
    && (!Number.isSafeInteger(config.maxValueCopper) || config.maxValueCopper < 0)) {
    return failure('validation', 'O limite de valor deve ser um inteiro não negativo em moedas de cobre.');
  }
  if (config.mode === 'faithful'
    && (config.maxValueCopper !== null || config.categories.length !== CATEGORIES.length)) {
    return failure('validation', 'O modo fiel exige todas as categorias e nenhum limite de valor.');
  }
  return success(config);
}

function resolveCandidate(target: ItemTarget, weight: number, catalog: TreasureCatalog): Result<Candidate> {
  const item = catalog.items.find((candidate) => candidate.id === target.itemId);
  return item ? success({ item, target, weight }) : failure('validation', 'Item referenciado não encontrado.');
}

function tableCandidates(table: TreasureTable, catalog: TreasureCatalog): Result<readonly Candidate[]> {
  const candidates: Candidate[] = [];
  for (const entry of table.entries) {
    const weight = entry.max - entry.min + 1;
    if (entry.target.kind === 'item') {
      const candidate = resolveCandidate(entry.target, weight, catalog);
      if (!candidate.ok) return candidate;
      candidates.push(candidate.value);
      continue;
    }
    const resolutionId = entry.target.resolutionId;
    const resolution = catalog.resolutions.find((candidate) => candidate.id === resolutionId);
    if (!resolution?.complete) return failure('validation', 'Resolução ausente ou incompleta.');
    for (const leaf of resolution.entries) {
      // A filtered variant retains its probability in BOTH original rolls.
      const jointWeight = weight * (leaf.max - leaf.min + 1) / resolution.sides;
      const candidate = resolveCandidate(leaf.target, jointWeight, catalog);
      if (!candidate.ok) return candidate;
      candidates.push(candidate.value);
    }
  }
  return success(candidates);
}

function eligible(candidate: Candidate, config: TreasureGenerationConfig): boolean {
  if (!config.categories.includes(candidate.item.category)) return false;
  if (config.maxValueCopper === null) return true;
  const value = calculateItemValue(candidate.item, candidate.target.variant);
  return value.kind === 'known'
    ? value.copper <= config.maxValueCopper
    : config.unknownValuePolicy === 'allowWithWarning';
}

export function chooseWeighted<T extends { readonly weight: number }>(
  candidates: readonly T[], random: RandomSource,
): Result<T> {
  if (!candidates.length) return failure('empty', 'Nenhum resultado elegível.');
  const total = candidates.reduce((sum, candidate) => sum + candidate.weight, 0);
  if (!Number.isFinite(total)
    || candidates.some((candidate) => !Number.isFinite(candidate.weight) || candidate.weight <= 0)) {
    return failure('validation', 'Pesos inválidos.');
  }
  const draw = random();
  if (!Number.isFinite(draw) || draw < 0 || draw >= 1) {
    return failure('validation', 'Fonte aleatória inválida.');
  }
  const threshold = draw * total;
  let cumulative = 0;
  for (const candidate of candidates) {
    cumulative += candidate.weight;
    if (threshold < cumulative) return success(candidate);
  }
  return failure('validation', 'Não foi possível resolver o sorteio ponderado.');
}

function customDraw(
  table: TreasureTable, catalog: TreasureCatalog,
  config: TreasureGenerationConfig, random: RandomSource,
): Result<Draw> {
  const candidates = tableCandidates(table, catalog);
  if (!candidates.ok) return candidates;
  const choice = chooseWeighted(candidates.value.filter((candidate) => eligible(candidate, config)), random);
  return choice.ok ? success({ candidate: choice.value, rolls: [] }) : choice;
}

function faithfulDraw(table: TreasureTable, catalog: TreasureCatalog, random: RandomSource): Result<Draw> {
  const roll = rollDie(100, random);
  if (!roll.ok) return roll;
  const entry = table.entries.find((candidate) => roll.value >= candidate.min && roll.value <= candidate.max);
  if (!entry) return failure('validation', 'Rolagem sem entrada na tabela.');
  let target: ItemTarget;
  const rolls = [roll.value];
  if (entry.target.kind === 'item') target = entry.target;
  else {
    const resolutionId = entry.target.resolutionId;
    const resolution = catalog.resolutions.find((candidate) => candidate.id === resolutionId);
    if (!resolution?.complete) return failure('validation', 'Resolução ausente ou incompleta.');
    const secondary = rollDie(resolution.sides, random);
    if (!secondary.ok) return secondary;
    const leaf = resolution.entries.find((candidate) => secondary.value >= candidate.min && secondary.value <= candidate.max);
    if (!leaf) return failure('validation', 'Resolução com lacuna.');
    target = leaf.target;
    rolls.push(secondary.value);
  }
  const candidate = resolveCandidate(target, 1, catalog);
  return candidate.ok ? success({ candidate: candidate.value, rolls }) : candidate;
}

export function generateTreasure(
  catalog: TreasureCatalog, config: TreasureGenerationConfig, dependencies: GenerationDependencies,
): Result<GeneratedTreasure> {
  const configuration = validateGenerationConfig(config);
  if (!configuration.ok) return configuration;
  const validation = validateCatalog(catalog);
  if (!validation.ok) return validation;
  const createdAt = normalizeTimestamp(dependencies.now());
  if (!createdAt) return failure('validation', 'Data do sorteio inválida.');
  const items: GeneratedItem[] = [];
  const generatedIds = new Set<string>();
  for (let index = 0; index < config.quantity; index++) {
    const rarity: Result<Rarity> = config.rarity.mode === 'manual'
      ? success(config.rarity.value) : selectRarity(config.level, dependencies.random);
    if (!rarity.ok) return rarity;
    const table = catalog.tables.find((candidate) => candidate.theme === config.theme && candidate.rarity === rarity.value);
    if (!table) return failure('empty', 'Não há tabela neste catálogo para o tema e a raridade sorteada. Nenhum novo sorteio foi feito.');
    if (!table.complete) return failure('validation', `A tabela ${table.name} está incompleta e não pode ser utilizada.`);
    const draw = config.mode === 'faithful'
      ? faithfulDraw(table, catalog, dependencies.random)
      : customDraw(table, catalog, config, dependencies.random);
    if (!draw.ok) return draw;
    const { candidate, rolls } = draw.value;
    const value = calculateItemValue(candidate.item, candidate.target.variant);
    const warnings: string[] = [];
    if (levelBand(config.level)?.probabilities[RARITIES.indexOf(rarity.value)] === 0) {
      warnings.push('Raridade fora da distribuição usual deste nível. A escolha do Mestre é permitida.');
    }
    if (value.kind === 'unknown') {
      warnings.push(`Valor não verificável: ${value.reason}${config.maxValueCopper !== null ? ' O limite de valor NÃO foi confirmado.' : ''}`);
    }
    const id = dependencies.id();
    if (!id.trim() || generatedIds.has(id)) return failure('validation', 'A fonte de IDs gerou identificadores vazios ou repetidos.');
    generatedIds.add(id);
    items.push({ id, item: candidate.item, variant: candidate.target.variant, value,
      tableId: table.id, rarity: rarity.value, rolls, warnings });
  }
  const id = dependencies.id();
  if (!id.trim() || generatedIds.has(id)) return failure('validation', 'A fonte de IDs gerou identificadores vazios ou repetidos.');
  return success({ id, config, items, createdAt });
}
