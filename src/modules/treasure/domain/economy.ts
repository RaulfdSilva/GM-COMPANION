import { COPPER_PER_GOLD, REFERENCE_COPPER } from './rules.ts';
import type { MagicItem, MoneyValue, VariantParameters } from './models.ts';
import { failure, success } from '../../../shared/types/result.ts';
import type { Result } from '../../../shared/types/result.ts';
export function calculateItemValue(item: MagicItem, variant: VariantParameters | null = null): MoneyValue {
  if (item.rarity === 'artifact') return { kind: 'unknown', reason: 'Artefatos não possuem preço padrão.' };
  if (item.pricing.kind === 'unknown') return { kind: 'unknown', reason: item.pricing.reason };
  if (item.category === 'Scroll' && item.pricing.kind !== 'scroll')
    return { kind: 'unknown', reason: 'Falta o custo de inscrição do pergaminho.' };
  let copper: number;
  if (item.pricing.kind === 'scroll') {
    if (item.pricing.inscriptionCopper === null)
      return { kind: 'unknown', reason: 'Custo de inscrição não informado.' };
    copper = item.pricing.inscriptionCopper;
  } else {
    copper = REFERENCE_COPPER[item.rarity] / (item.consumable ? 2 : 1);
  }
  const base = variant?.baseEquipment ?? item.baseEquipment;
  if (base && base.costCopper === null)
    return { kind: 'unknown', reason: `Custo do equipamento-base ${base.name} desconhecido.` };
  const total = copper + (base?.costCopper ?? 0) + item.additionalCostCopper + (variant?.additionalCostCopper ?? 0);
  if (!Number.isSafeInteger(total) || total < 0)
    return { kind: 'unknown', reason: 'Valor total fora do intervalo monetário seguro.' };
  return { kind: 'known', copper: total };
}
export function parseGoldInput(input: string): Result<number | null> {
  if (!input.trim()) return success(null);
  const normalized = input.trim().replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(normalized))
    return failure('validation', 'Informe PO sem separador de milhar e com até duas casas decimais.');
  const [whole = '0', decimals = ''] = normalized.split('.');
  const copper = Number(whole) * COPPER_PER_GOLD + Number(decimals.padEnd(2, '0'));
  return Number.isSafeInteger(copper) ? success(copper) : failure('validation', 'Valor monetário muito alto.');
}
export const formatCopper = (copper: number): string =>
  `${(copper / COPPER_PER_GOLD).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} PO`;
