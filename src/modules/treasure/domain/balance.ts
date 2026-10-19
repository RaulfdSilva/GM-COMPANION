import { RARITIES } from './models.ts';
import type { BalanceAssessment, ItemRarity, TreasureAward } from './models.ts';
import { levelBand } from './rules.ts';
export function assessReward(input: Readonly<{
  level: number; rarity: ItemRarity; history: readonly TreasureAward[] | null;
  partySize: number | null; proposedCount?: number;
}>): BalanceAssessment {
  const rulesUsed = ['Referência de progressão por faixa de níveis fornecida no projeto.', 'Contagem por raridade e nível no momento da concessão; faixas anteriores não são somadas.', 'Comparação quantitativa é uma adaptação do aplicativo, não uma regra oficial de poder.'];
  const warnings = ['Raridades iguais não significam poder equivalente.', 'A quantidade de personagens é apenas contextual; nenhum multiplicador foi aplicado.'];
  const band = levelBand(input.level);
  const count = input.proposedCount ?? 1;
  if (!band || input.history === null || input.rarity === 'artifact' || !Number.isInteger(count) || count < 1) {
    return { classification: 'insufficientData', explanation: 'Não há dados suficientes para comparar a recompensa.', rulesUsed, warnings,
      insufficientData: [!band ? 'Nível inválido.' : input.history === null ? 'Histórico não informado.' : input.rarity === 'artifact' ? 'Artefatos não possuem referência nesta matriz.' : 'Quantidade proposta inválida.'], accumulated: null, reference: null, partySize: input.partySize };
  }
  const reference = band.progression[RARITIES.indexOf(input.rarity)] ?? 0;
  const accumulated = input.history.filter((award) => award.partyLevel >= band.min && award.partyLevel <= band.max && award.rarity === input.rarity).length;
  const classification = reference === 0 ? 'unusual' : accumulated + count > reference ? 'aboveReference' : 'withinReference';
  return { classification,
    explanation: `${accumulated} item(ns) desta raridade registrados na faixa ${band.min}–${band.max}; com ${count} proposto(s), serão ${accumulated + count}. Referência da faixa: ${reference}. Isso não é um limite rígido.`,
    rulesUsed, warnings, insufficientData: [], accumulated, reference, partySize: input.partySize };
}
