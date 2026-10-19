import { z } from 'zod';
import { failure } from '../../../shared/types/result.ts';
import type { Result } from '../../../shared/types/result.ts';
import { CATEGORIES, RARITIES, THEMES } from '../domain/models.ts';
import type { TreasureCatalog } from '../domain/models.ts';
import { validateCatalog } from '../domain/catalog-validation.ts';
const id = z.string().trim().min(1).max(120);
const text = z.string().min(1).max(1000);
const copper = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const source = z.object({ name: text, license: text, kind: z.enum(['original', 'srd', 'private']), attribution: z.string().max(2000) }).strict();
const baseEquipment = z.object({ name: text, costCopper: copper.nullable() }).strict().nullable();
const variant = z.object({ label: text, baseEquipment, additionalCostCopper: copper }).strict().nullable();
const itemTarget = z.object({ kind: z.literal('item'), itemId: id, variant }).strict();
const target = z.discriminatedUnion('kind', [itemTarget, z.object({ kind: z.literal('resolution'), resolutionId: id }).strict()]);
const interval = { min: z.number().int().min(1).max(100), max: z.number().int().min(1).max(100) };
export const catalogSchema = z.object({
  schemaVersion: z.literal(1),
  items: z.array(z.object({
    id, name: text, rarity: z.enum([...RARITIES, 'artifact']), category: z.enum(CATEGORIES),
    themes: z.array(z.enum(THEMES)).min(1).max(4), consumable: z.boolean(), attunement: z.boolean(),
    pricing: z.discriminatedUnion('kind', [
      z.object({ kind: z.literal('reference') }).strict(),
      z.object({ kind: z.literal('scroll'), inscriptionCopper: copper.nullable() }).strict(),
      z.object({ kind: z.literal('unknown'), reason: text }).strict(),
    ]), baseEquipment, additionalCostCopper: copper, source,
    description: z.string().max(10000), variantMetadata: z.record(z.string().max(120), z.string().max(1000)),
  }).strict()).min(1).max(5000),
  tables: z.array(z.object({
    id, name: text, rarity: z.enum(RARITIES), theme: z.enum(THEMES), complete: z.boolean(), source,
    entries: z.array(z.object({ tableId: id, ...interval, target }).strict()).min(1).max(100),
  }).strict()).min(1).max(100),
  resolutions: z.array(z.object({
    id, name: text, sides: z.number().int().min(1).max(100), complete: z.boolean(),
    entries: z.array(z.object({ ...interval, target: itemTarget }).strict()).min(1).max(100),
  }).strict()).max(500),
}).strict();
export function importCatalog(input: unknown): Result<TreasureCatalog> {
  const parsed = catalogSchema.safeParse(input);
  if (!parsed.success) return failure('validation', 'O JSON não segue o formato de catálogo.', parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`));
  return validateCatalog(parsed.data);
}
export const MAX_IMPORT_CHARACTERS = 2_000_000;
export function importCatalogText(text: string): Result<TreasureCatalog> {
  if (text.length > MAX_IMPORT_CHARACTERS) return failure('validation', 'O catálogo deve ter no máximo 2 MB de texto.');
  let input: unknown;
  try { input = JSON.parse(text); } catch { return failure('validation', 'O arquivo não contém JSON válido.'); }
  return importCatalog(input);
}
