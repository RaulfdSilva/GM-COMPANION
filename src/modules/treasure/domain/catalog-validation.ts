import { pricingIssues } from './economy.ts';
import type { ItemTarget, TreasureCatalog, TreasureTable } from './models.ts';
import { failure, success } from '../../../shared/types/result.ts';
import type { Result } from '../../../shared/types/result.ts';
type Interval = Readonly<{ min: number; max: number }>;
function validateIntervals(
  entries: readonly Interval[],
  sides: number,
  complete: boolean,
  label: string,
): string[] {
  const issues: string[] = [];
  const covered = new Set<number>();
  const intervals = new Set<string>();
  for (const entry of entries) {
    if (
      !Number.isInteger(entry.min) ||
      !Number.isInteger(entry.max) ||
      entry.min < 1 ||
      entry.max > sides ||
      entry.min > entry.max
    ) {
      issues.push(`${label}: intervalo inválido ${entry.min}–${entry.max}.`);
      continue;
    }
    const key = `${entry.min}:${entry.max}`;
    if (intervals.has(key)) issues.push(`${label}: entrada duplicada ${key}.`);
    intervals.add(key);
    for (let face = entry.min; face <= entry.max; face++) {
      if (covered.has(face)) issues.push(`${label}: sobreposição na face ${face}.`);
      covered.add(face);
    }
  }
  if (complete && covered.size !== sides) issues.push(`${label}: tabela completa possui lacunas.`);
  return issues;
}
export function validateCatalog(catalog: TreasureCatalog): Result<TreasureCatalog> {
  const issues: string[] = [];
  for (const [label, records] of [
    ['item', catalog.items],
    ['tabela', catalog.tables],
    ['resolução', catalog.resolutions],
  ] as const) {
    const ids = new Set<string>();
    for (const record of records) {
      if (!record.id.trim()) issues.push(`ID de ${label} vazio.`);
      if (ids.has(record.id)) issues.push(`ID de ${label} duplicado: ${record.id}.`);
      ids.add(record.id);
    }
  }
  for (const item of catalog.items) {
    if (!item.name.trim()) issues.push(`${item.id}: nome do item vazio.`);
    issues.push(...pricingIssues(item).map((issue) => `${item.id}: ${issue}`));
  }
  const items = new Map(catalog.items.map((item) => [item.id, item]));
  const resolutions = new Map(catalog.resolutions.map((resolution) => [resolution.id, resolution]));
  const checkTarget = (target: ItemTarget, table?: TreasureTable) => {
    const item = items.get(target.itemId);
    if (!item) {
      issues.push(`Referência inexistente: ${target.itemId}.`);
      return;
    }
    issues.push(...pricingIssues(item, target.variant).map((issue) => `${item.id}: ${issue}`));
    if (table && (item.rarity !== table.rarity || !item.themes.includes(table.theme)))
      issues.push(`${table.id}: raridade ou tema incoerente para ${item.id}.`);
  };
  for (const resolution of catalog.resolutions) {
    if (!Number.isInteger(resolution.sides) || resolution.sides < 1 || resolution.sides > 100) {
      issues.push(`${resolution.id}: dado de resolução deve possuir entre 1 e 100 faces.`);
      continue;
    }
    issues.push(
      ...validateIntervals(
        resolution.entries,
        resolution.sides,
        resolution.complete,
        resolution.id,
      ),
    );
    resolution.entries.forEach((entry) => checkTarget(entry.target));
  }
  const combinations = new Set<string>();
  for (const table of catalog.tables) {
    const key = `${table.theme}:${table.rarity}`;
    if (combinations.has(key))
      issues.push(`Mais de uma tabela para ${key}. Importe como catálogo separado.`);
    combinations.add(key);
    issues.push(...validateIntervals(table.entries, 100, table.complete, table.id));
    for (const entry of table.entries) {
      if (entry.tableId !== table.id)
        issues.push(`${table.id}: identificador da entrada incoerente.`);
      if (entry.target.kind === 'item') {
        checkTarget(entry.target, table);
        continue;
      }
      const resolution = resolutions.get(entry.target.resolutionId);
      if (!resolution) {
        issues.push(`${table.id}: resolução inexistente.`);
        continue;
      }
      if (table.complete && !resolution.complete)
        issues.push(`${table.id}: depende de resolução incompleta.`);
      resolution.entries.forEach((resolved) => checkTarget(resolved.target, table));
    }
  }
  return issues.length ? failure('validation', 'Catálogo inválido.', issues) : success(catalog);
}
