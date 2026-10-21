import { failure, success } from '../../../shared/types/result.ts';
import type { Result } from '../../../shared/types/result.ts';
import { isCopperAmount } from '../domain/economy.ts';
import { COPPER_PER_GOLD } from '../domain/rules.ts';

export function parseGoldInput(input: string): Result<number | null> {
  if (!input.trim()) return success(null);
  const normalized = input.trim().replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
    return failure(
      'validation',
      'Informe PO sem separador de milhar e com até duas casas decimais.',
    );
  }
  const [whole = '0', decimals = ''] = normalized.split('.');
  const copper = Number(whole) * COPPER_PER_GOLD + Number(decimals.padEnd(2, '0'));
  return isCopperAmount(copper)
    ? success(copper)
    : failure('validation', 'Valor monetário muito alto.');
}

export function formatGoldInput(copper: number): string {
  if (!isCopperAmount(copper)) throw new RangeError('Valor em cobre inválido para edição.');
  const fraction = copper % COPPER_PER_GOLD;
  const whole = (copper - fraction) / COPPER_PER_GOLD;
  return `${whole}.${String(fraction).padStart(2, '0')}`;
}

export function formatCopper(copper: number): string {
  if (!isCopperAmount(copper)) return 'Valor inválido';
  const [whole = '0', fraction = '00'] = formatGoldInput(copper).split('.');
  const decimals = fraction.replace(/0+$/, '');
  // Format the integer part separately: dividing large copper totals loses cents.
  return `${Number(whole).toLocaleString('pt-BR')}${decimals ? `,${decimals}` : ''} PO`;
}
