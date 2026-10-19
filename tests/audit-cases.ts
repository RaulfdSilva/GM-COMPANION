import { formatCopper, parseGoldInput } from '../src/modules/treasure/presentation/money.ts';
import assert from 'node:assert/strict';
import { calculateItemValue } from '../src/modules/treasure/domain/economy.ts';
import { generateTreasure, validateGenerationConfig, chooseWeighted } from '../src/modules/treasure/domain/generator.ts';
import { validateCatalog } from '../src/modules/treasure/domain/catalog-validation.ts';
import { generateForCampaign } from '../src/modules/treasure/application/generate-for-campaign.ts';
import { validateAward } from '../src/modules/treasure/application/award-service.ts';
import { assessReward } from '../src/modules/treasure/domain/balance.ts';
import type { TreasureGenerationConfig, TreasureTable, MagicItem } from '../src/modules/treasure/domain/models.ts';
import type { TestCase } from './domain-cases.ts';
import { award, campaign, catalog, configuration, dependencies, item } from './fixtures.ts';

export const auditCases: readonly TestCase[] = [
  {
    name: 'auditoria: moeda mantém cada cobre até MAX_SAFE_INTEGER na exibição',
    run() {
      assert.equal(formatCopper(Number.MAX_SAFE_INTEGER), '90.071.992.547.409,91 PO');
      assert.deepEqual(parseGoldInput('90071992547409,91'), { ok: true, value: Number.MAX_SAFE_INTEGER });
      assert.equal(parseGoldInput('90071992547409,92').ok, false);
    },
  },
  {
    name: 'auditoria: parcelas monetárias inválidas não se cancelam em um total válido',
    run() {
      for (const cost of [-1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
        assert.equal(calculateItemValue({ ...item, additionalCostCopper: cost }).kind, 'unknown');
        assert.equal(calculateItemValue({ ...item, baseEquipment: { name: 'Base', costCopper: cost } }).kind, 'unknown');
      }
      assert.equal(calculateItemValue({ ...item, additionalCostCopper: -1 }, { label: 'Variante', baseEquipment: null, additionalCostCopper: 1 }).kind, 'unknown');
    },
  },
  {
    name: 'auditoria: custo de inscrição não é aplicado a itens de outra categoria',
    run() {
      const invalid: MagicItem = { ...item, pricing: { kind: 'scroll', inscriptionCopper: 100 } };
      assert.equal(calculateItemValue(invalid).kind, 'unknown');
      assert.equal(validateCatalog({ ...catalog, items: [invalid, ...catalog.items.slice(1)] }).ok, false);
    },
  },
  {
    name: 'auditoria: catálogo rejeita custos negativos e fracionários no núcleo independente',
    run() {
      assert.equal(validateCatalog({ ...catalog, items: [{ ...item, additionalCostCopper: -1 }, ...catalog.items.slice(1)] }).ok, false);
      assert.equal(validateCatalog({ ...catalog, items: [{ ...item, baseEquipment: { name: 'Base', costCopper: 0.5 } }, ...catalog.items.slice(1)] }).ok, false);
    },
  },
  {
    name: 'auditoria: modos desconhecidos não são tratados como automático ou personalizado',
    run() {
      for (const config of [
        { ...configuration, mode: 'invalid' },
        { ...configuration, rarity: { mode: 'invalid' } },
        { ...configuration, unknownValuePolicy: 'invalid' },
      ]) assert.equal(validateGenerationConfig(config as TreasureGenerationConfig).ok, false);
    },
  },
  {
    name: 'auditoria: IDs duplicados ou vazios não geram resultados ambíguos',
    run() {
      for (const id of ['', 'same-id']) {
        const result = generateTreasure(catalog, { ...configuration, quantity: 2 }, { ...dependencies(), id: () => id });
        assert.equal(result.ok, false);
      }
    },
  },
  {
    name: 'auditoria: avaliação ignora recompensas de outras campanhas',
    run() {
      const result = generateForCampaign({ campaign, catalog, config: configuration, history: Array.from({ length: 10 }, (_, i) => ({ ...award, id: String(i), campaignId: 'another' })) }, dependencies());
      assert.ok(result.ok);
      const first = result.value.treasure.items[0]; assert.ok(first);
      assert.equal(result.value.assessments[first.id]?.accumulated, 0);
    },
  },
  {
    name: 'auditoria: datas inexistentes e ambíguas são rejeitadas no histórico',
    run() {
      for (const date of ['2026-02-30T00:00:00.000Z', '10/11/2026', '2026'])
        assert.equal(validateAward({ ...award, awardedAt: date })?.ok, false);
    },
  },
  {
    name: 'auditoria: quantidade insegura para balanceamento indica dados insuficientes',
    run() {
      assert.equal(assessReward({ level: 1, rarity: 'common', history: [], partySize: 4, proposedCount: Number.MAX_SAFE_INTEGER + 1 }).classification, 'insufficientData');
    },
  },
  {
    name: 'auditoria: intervalos invertidos, fracionários e resolução inválida são recusados',
    run() {
      const first = catalog.tables[0] as TreasureTable;
      const entry = first.entries[0]; assert.ok(entry);
      for (const patch of [{ min: 2, max: 1 }, { min: 0.5 }, { max: 101 }]) {
        assert.equal(validateCatalog({ ...catalog, tables: [{ ...first, entries: [{ ...entry, ...patch }, ...first.entries.slice(1)] }] }).ok, false);
      }
      const resolution = catalog.resolutions[0]; assert.ok(resolution);
      for (const sides of [0, 101, NaN, 1.5])
        assert.equal(validateCatalog({ ...catalog, resolutions: [{ ...resolution, sides }, ...catalog.resolutions.slice(1)] }).ok, false);
    },
  },
  {
    name: 'auditoria: pesos filtrados de categorias mantêm a razão 20:15',
    run() {
      for (const [draw, category] of [[0, 'Potion'], [19.999 / 35, 'Potion'], [20 / 35, 'Ring'], [0.999999, 'Ring']] as const) {
        const result = generateTreasure(catalog, { ...configuration, categories: ['Potion', 'Ring'], maxValueCopper: 10000 }, dependencies([draw]));
        assert.ok(result.ok);
        assert.equal(result.value.items[0]?.item.category, category);
      }
    },
  },
  {
    name: 'auditoria: tabela ausente não provoca ressorteio nem retorna lote parcial',
    run() {
      const data = { ...catalog, tables: catalog.tables.filter((table) => table.rarity === 'common') };
      let index = 0;
      const sequence = [0, 0, 0.99];
      const result = generateTreasure(data, { ...configuration, rarity: { mode: 'automatic' }, quantity: 2 }, { ...dependencies(), random: () => sequence[index++] ?? 0 });
      assert.ok(!result.ok);
      assert.equal(result.error.kind, 'empty');
      assert.equal(index, 3);
    },
  },
  {
    name: 'auditoria: sorteio ponderado rejeita overflow e RNG inválido',
    run() {
      assert.equal(chooseWeighted([{ weight: Number.MAX_VALUE }, { weight: Number.MAX_VALUE }], () => 0).ok, false);
      for (const draw of [-0.1, 1, NaN, Infinity]) assert.equal(chooseWeighted([{ weight: 1 }], () => draw).ok, false);
    },
  },
];
