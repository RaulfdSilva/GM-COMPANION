import type { MagicItem, MoneyValue, VariantParameters } from './models.ts';
import { REFERENCE_COPPER } from './rules.ts';

export function isCopperAmount(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0;
}

export function pricingIssues(item: MagicItem, variant: VariantParameters | null = null): string[] {
  const issues: string[] = [];
  if (item.pricing.kind === 'scroll' && item.category !== 'Scroll') {
    issues.push('Custo de inscrição só pode ser aplicado a pergaminhos.');
  }
  const amounts = [item.additionalCostCopper];
  if (item.pricing.kind === 'scroll' && item.pricing.inscriptionCopper !== null) {
    amounts.push(item.pricing.inscriptionCopper);
  }
  for (const base of [item.baseEquipment, variant?.baseEquipment]) {
    if (base && base.costCopper !== null) amounts.push(base.costCopper);
  }
  if (variant) amounts.push(variant.additionalCostCopper);
  if (amounts.some((amount) => !isCopperAmount(amount))) {
    issues.push(
      'Cada parcela monetária deve ser um inteiro não negativo em cobre dentro do limite seguro.',
    );
  }
  return issues;
}

export function calculateItemValue(
  item: MagicItem,
  variant: VariantParameters | null = null,
): MoneyValue {
  const issues = pricingIssues(item, variant);
  if (issues.length) return { kind: 'unknown', reason: issues.join(' ') };
  if (item.rarity === 'artifact') {
    return { kind: 'unknown', reason: 'Artefatos não possuem preço padrão.' };
  }
  if (item.pricing.kind === 'unknown') return { kind: 'unknown', reason: item.pricing.reason };
  if (item.category === 'Scroll' && item.pricing.kind !== 'scroll') {
    return { kind: 'unknown', reason: 'Falta o custo de inscrição do pergaminho.' };
  }

  let copper: number;
  if (item.pricing.kind === 'scroll') {
    if (item.pricing.inscriptionCopper === null) {
      return { kind: 'unknown', reason: 'Custo de inscrição não informado.' };
    }
    copper = item.pricing.inscriptionCopper;
  } else {
    copper = REFERENCE_COPPER[item.rarity] / (item.consumable ? 2 : 1);
  }
  const base = variant?.baseEquipment ?? item.baseEquipment;
  if (base && base.costCopper === null) {
    return { kind: 'unknown', reason: `Custo do equipamento-base ${base.name} desconhecido.` };
  }
  const total =
    copper +
    (base?.costCopper ?? 0) +
    item.additionalCostCopper +
    (variant?.additionalCostCopper ?? 0);
  return isCopperAmount(total)
    ? { kind: 'known', copper: total }
    : { kind: 'unknown', reason: 'Valor total fora do intervalo monetário seguro.' };
}
