import { isPartyLevel } from '../../../shared/rules/party-level.ts';
import { RARITIES } from './models.ts';
import type { BalanceAssessment, ItemRarity, TreasureAward } from './models.ts';
import { levelBand } from './rules.ts';

type AssessmentInput = Readonly<{
  level: number;
  rarity: ItemRarity;
  history: readonly TreasureAward[] | null;
  partySize: number | null;
  proposedCount?: number;
}>;

export function assessReward(input: AssessmentInput): BalanceAssessment {
  const rulesUsed = [
    'Referência de progressão por faixa de níveis fornecida no projeto.',
    'Contagem por raridade e nível no momento da concessão; faixas anteriores não são somadas.',
    'Comparação quantitativa é uma adaptação do aplicativo, não uma regra oficial de poder.',
  ];
  const warnings = [
    'Raridades iguais não significam poder equivalente.',
    'A quantidade de personagens é apenas contextual; nenhum multiplicador foi aplicado.',
  ];
  const band = levelBand(input.level);
  const count = input.proposedCount ?? 1;
  const insufficientData: string[] = [];
  if (!band) insufficientData.push('Nível inválido.');
  if (input.history === null) insufficientData.push('Histórico não informado.');
  if (input.rarity === 'artifact') insufficientData.push('Artefatos não possuem referência nesta matriz.');
  if (!Number.isSafeInteger(count) || count < 1) insufficientData.push('Quantidade proposta inválida.');
  if (input.history?.some((award) => !isPartyLevel(award.partyLevel))) {
    insufficientData.push('O histórico contém níveis inválidos.');
  }
  const partySize = input.partySize !== null && Number.isSafeInteger(input.partySize) && input.partySize >= 0
    ? input.partySize : null;
  const unavailable = (): BalanceAssessment => ({
    classification: 'insufficientData',
    explanation: 'Não há dados suficientes para comparar a recompensa.',
    rulesUsed, warnings, insufficientData, accumulated: null, reference: null, partySize,
  });
  if (!band || input.history === null || input.rarity === 'artifact' || insufficientData.length) {
    return unavailable();
  }
  const reference = band.progression[RARITIES.indexOf(input.rarity)] ?? 0;
  const accumulated = input.history.filter((award) =>
    award.partyLevel >= band.min && award.partyLevel <= band.max && award.rarity === input.rarity,
  ).length;
  const proposedTotal = accumulated + count;
  if (!Number.isSafeInteger(proposedTotal)) {
    insufficientData.push('Total acumulado fora do intervalo inteiro seguro.');
    return unavailable();
  }
  const classification = reference === 0 ? 'unusual'
    : proposedTotal > reference ? 'aboveReference' : 'withinReference';
  return {
    classification,
    explanation: `${accumulated} item(ns) desta raridade registrados na faixa ${band.min}–${band.max}; com ${count} proposto(s), serão ${proposedTotal}. Referência da faixa: ${reference}. Isso não é um limite rígido.`,
    rulesUsed, warnings, insufficientData, accumulated, reference, partySize,
  };
}
