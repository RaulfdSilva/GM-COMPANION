import { parseGoldInput } from '../src/modules/treasure/presentation/money.ts';
import assert from 'node:assert/strict';
import { calculateItemValue } from '../src/modules/treasure/domain/economy.ts';
import { chooseWeighted, generateTreasure } from '../src/modules/treasure/domain/generator.ts';
import { LEVEL_BANDS, selectRarity } from '../src/modules/treasure/domain/rules.ts';
import { validateCatalog } from '../src/modules/treasure/domain/catalog-validation.ts';
import { assessReward } from '../src/modules/treasure/domain/balance.ts';
import { CATEGORIES } from '../src/modules/treasure/domain/models.ts';
import type {
  MagicItem,
  TreasureCatalog,
  TreasureTable,
} from '../src/modules/treasure/domain/models.ts';
import { rarityTotals, validateAward } from '../src/modules/treasure/application/award-service.ts';
import { award, catalog, configuration, dependencies, item } from './fixtures.ts';
export type TestCase = Readonly<{ name: string; run: () => void | Promise<void> }>;
const modifiedTable = (patch: Partial<TreasureTable>): TreasureCatalog => ({
  ...catalog,
  tables: [{ ...(catalog.tables[0] as TreasureTable), ...patch }],
});
const generation = (random: readonly number[], config = configuration) =>
  generateTreasure(catalog, config, dependencies(random));
const itemWith = (patch: Partial<MagicItem>): MagicItem => ({ ...item, ...patch });
export const domainCases: readonly TestCase[] = [
  {
    name: 'cada faixa soma exatamente 100%',
    run() {
      for (const band of LEVEL_BANDS)
        assert.equal(
          band.probabilities.reduce((sum: number, value) => sum + value, 0),
          100,
        );
    },
  },
  {
    name: 'fronteiras de raridade em todos os níveis e faces',
    run() {
      for (let level = 1; level <= 20; level++) {
        const counts = new Map<string, number>();
        for (let face = 1; face <= 100; face++) {
          const result = selectRarity(level, () => (face - 0.5) / 100);
          assert.ok(result.ok);
          counts.set(result.value, (counts.get(result.value) ?? 0) + 1);
        }
        const band = LEVEL_BANDS.find(
          (candidate) => level >= candidate.min && level <= candidate.max,
        );
        assert.ok(band);
        ['common', 'uncommon', 'rare', 'veryRare', 'legendary'].forEach((rarity, index) =>
          assert.equal(counts.get(rarity) ?? 0, band.probabilities[index]),
        );
      }
    },
  },
  {
    name: 'raridade rejeita níveis e fontes aleatórias inválidos',
    run() {
      for (const level of [0, 21, 1.5, NaN]) assert.equal(selectRarity(level, () => 0).ok, false);
      for (const random of [-1, 1, NaN, Infinity])
        assert.equal(selectRarity(1, () => random).ok, false);
    },
  },
  {
    name: 'sorteio ponderado preserva pesos 10:2 e suas fronteiras',
    run() {
      const options = [
        { id: 'a', weight: 10 },
        { id: 'b', weight: 2 },
      ];
      for (const [value, expected] of [
        [0, 'a'],
        [9.99 / 12, 'a'],
        [10 / 12, 'b'],
        [0.99999, 'b'],
      ] as const) {
        const result = chooseWeighted(options, () => value);
        assert.ok(result.ok);
        assert.equal(result.value.id, expected);
      }
    },
  },
  {
    name: 'sorteio vazio e pesos inválidos retornam erros estruturados',
    run() {
      const empty = chooseWeighted([], () => 0);
      assert.ok(!empty.ok);
      assert.equal(empty.error.kind, 'empty');
      assert.equal(chooseWeighted([{ weight: 0 }], () => 0).ok, false);
    },
  },
  {
    name: 'consumível recebe metade do preço de referência',
    run() {
      assert.deepEqual(calculateItemValue(item), { kind: 'known', copper: 5000 });
    },
  },
  {
    name: 'item permanente recebe preço integral',
    run() {
      assert.deepEqual(calculateItemValue(itemWith({ consumable: false })), {
        kind: 'known',
        copper: 10000,
      });
    },
  },
  {
    name: 'pergaminho usa custo específico sem desconto de consumível',
    run() {
      assert.deepEqual(
        calculateItemValue(
          itemWith({ category: 'Scroll', pricing: { kind: 'scroll', inscriptionCopper: 12345 } }),
        ),
        { kind: 'known', copper: 12345 },
      );
    },
  },
  {
    name: 'pergaminho sem custo e artefato não têm valor zero',
    run() {
      assert.equal(calculateItemValue(itemWith({ category: 'Scroll' })).kind, 'unknown');
      assert.equal(
        calculateItemValue(
          itemWith({ category: 'Scroll', pricing: { kind: 'scroll', inscriptionCopper: null } }),
        ).kind,
        'unknown',
      );
      assert.equal(calculateItemValue(itemWith({ rarity: 'artifact' })).kind, 'unknown');
    },
  },
  {
    name: 'custo inclui equipamento, modificador do item e variante',
    run() {
      assert.deepEqual(
        calculateItemValue(
          itemWith({
            consumable: false,
            baseEquipment: { name: 'Espada', costCopper: 1500 },
            additionalCostCopper: 500,
          }),
          { label: 'Prata', baseEquipment: null, additionalCostCopper: 1000 },
        ),
        { kind: 'known', copper: 13000 },
      );
    },
  },
  {
    name: 'variante pode substituir equipamento-base',
    run() {
      assert.deepEqual(
        calculateItemValue(
          itemWith({ consumable: false, baseEquipment: { name: 'Espada', costCopper: 1500 } }),
          {
            label: 'Lança',
            baseEquipment: { name: 'Lança', costCopper: 100 },
            additionalCostCopper: 0,
          },
        ),
        { kind: 'known', copper: 10100 },
      );
    },
  },
  {
    name: 'equipamento com preço desconhecido impede confirmar orçamento',
    run() {
      assert.equal(
        calculateItemValue(itemWith({ baseEquipment: { name: 'X', costCopper: null } })).kind,
        'unknown',
      );
    },
  },
  {
    name: 'entrada monetária decimal usa centavos exatos',
    run() {
      assert.deepEqual(parseGoldInput('0,29'), { ok: true, value: 29 });
      assert.deepEqual(parseGoldInput('100.01'), { ok: true, value: 10001 });
      assert.deepEqual(parseGoldInput(''), { ok: true, value: null });
      for (const value of ['-1', '1.001', '1e3', 'abc', '1.000,20', '99999999999999999999'])
        assert.equal(parseGoldInput(value).ok, false);
    },
  },
  {
    name: 'orçamento é inclusivo e não considera desconhecido como zero',
    run() {
      assert.equal(
        generation([0], { ...configuration, maxValueCopper: 5000, categories: ['Potion'] }).ok,
        true,
      );
      const result = generation([0], {
        ...configuration,
        maxValueCopper: 4999,
        categories: ['Potion'],
      });
      assert.ok(!result.ok);
      assert.equal(result.error.kind, 'empty');
      assert.equal(
        generation([0], { ...configuration, maxValueCopper: 1000000, categories: ['Scroll'] }).ok,
        false,
      );
    },
  },
  {
    name: 'Mestre pode permitir valor desconhecido com alerta explícito',
    run() {
      const result = generation([0], {
        ...configuration,
        maxValueCopper: 1,
        categories: ['Scroll'],
        unknownValuePolicy: 'allowWithWarning',
      });
      assert.ok(result.ok);
      assert.match(result.value.items[0]?.warnings.join(' ') ?? '', /NÃO foi confirmado/);
    },
  },
  {
    name: 'filtros combinados respeitam categoria, raridade, tema e custo total',
    run() {
      const result = generation([0.9], {
        ...configuration,
        theme: 'Armaments',
        categories: ['Weapon'],
        maxValueCopper: 11600,
      });
      assert.ok(result.ok);
      assert.equal(result.value.items[0]?.variant?.label, 'Acabamento de cobre');
      assert.equal(
        generation([0], { ...configuration, categories: ['Weapon'], maxValueCopper: 11599 }).ok,
        false,
      );
    },
  },
  {
    name: 'modo manual não sorteia raridade e aceita lendário no nível 1',
    run() {
      let calls = 0;
      const result = generateTreasure(
        catalog,
        { ...configuration, rarity: { mode: 'manual', value: 'legendary' } },
        {
          ...dependencies(),
          random: () => {
            calls++;
            return 0;
          },
        },
      );
      assert.ok(result.ok);
      assert.equal(calls, 1);
      assert.match(result.value.items[0]?.warnings.join(' ') ?? '', /fora da distribuição/);
    },
  },
  {
    name: 'modo fiel rejeita filtros que mudariam a distribuição',
    run() {
      assert.equal(
        generation([0], { ...configuration, mode: 'faithful', categories: ['Potion'] }).ok,
        false,
      );
      assert.equal(
        generation([0], { ...configuration, mode: 'faithful', maxValueCopper: 10000 }).ok,
        false,
      );
    },
  },
  {
    name: 'modo fiel respeita todas as fronteiras inclusivas das 20 tabelas d100',
    run() {
      for (const table of catalog.tables)
        for (const entry of table.entries)
          for (const face of [entry.min, entry.max]) {
            const result = generation([(face - 0.5) / 100, 0], {
              ...configuration,
              mode: 'faithful',
              theme: table.theme,
              rarity: { mode: 'manual', value: table.rarity },
              categories: CATEGORIES,
            });
            assert.ok(result.ok);
            assert.equal(result.value.items[0]?.rolls[0], face);
            const expected =
              entry.target.kind === 'item' ? entry.target.itemId : `demo-${table.rarity}-6`;
            assert.equal(result.value.items[0]?.item.id, expected);
          }
    },
  },
  {
    name: 'resolução adicional respeita faces 1,4,5,6',
    run() {
      for (const face of [1, 4, 5, 6]) {
        const result = generation([0.8, (face - 0.5) / 6], { ...configuration, mode: 'faithful' });
        assert.ok(result.ok);
        assert.equal(
          result.value.items[0]?.variant?.label,
          face <= 4 ? 'Acabamento de cobre' : 'Acabamento de prata',
        );
      }
    },
  },
  {
    name: 'personalização preserva probabilidade conjunta de variantes 4:2',
    run() {
      for (const [draw, label] of [
        [0, 'cobre'],
        [0.66, 'cobre'],
        [0.67, 'prata'],
        [0.999, 'prata'],
      ] as const) {
        const result = generation([draw], { ...configuration, categories: ['Weapon'] });
        assert.ok(result.ok);
        assert.match(result.value.items[0]?.variant?.label ?? '', new RegExp(label));
        assert.deepEqual(result.value.items[0]?.rolls, []);
      }
    },
  },
  {
    name: 'automático não ressorteia raridade quando filtros ficam vazios',
    run() {
      let calls = 0;
      const result = generateTreasure(
        catalog,
        {
          ...configuration,
          rarity: { mode: 'automatic' },
          categories: ['Potion'],
          maxValueCopper: 4999,
        },
        {
          ...dependencies(),
          random: () => {
            calls++;
            return 0;
          },
        },
      );
      assert.ok(!result.ok);
      assert.equal(result.error.kind, 'empty');
      assert.equal(calls, 1);
    },
  },
  {
    name: 'quantidade inválida e checklist vazio são rejeitados',
    run() {
      for (const quantity of [-1, 0, 101, 1.2, NaN, Infinity])
        assert.equal(generation([0], { ...configuration, quantity }).ok, false);
      assert.equal(generation([0], { ...configuration, categories: [] }).ok, false);
    },
  },
  {
    name: 'catálogo demonstrativo possui 20 tabelas válidas sem duplicar identidades',
    run() {
      assert.equal(validateCatalog(catalog).ok, true);
      assert.equal(catalog.tables.length, 20);
      assert.equal(catalog.items.length, 45);
    },
  },
  {
    name: 'tabela completa com lacuna nunca é aceita',
    run() {
      const entries = catalog.tables[0]?.entries.slice(1) ?? [];
      assert.equal(validateCatalog(modifiedTable({ entries })).ok, false);
    },
  },
  {
    name: 'tabela incompleta pode ser importada mas não sorteada',
    run() {
      const data = modifiedTable({
        complete: false,
        entries: catalog.tables[0]?.entries.slice(1) ?? [],
      });
      assert.equal(validateCatalog(data).ok, true);
      assert.equal(generateTreasure(data, configuration, dependencies()).ok, false);
    },
  },
  {
    name: 'sobreposição, duplicatas e limites inválidos são rejeitados',
    run() {
      const table = catalog.tables[0] as TreasureTable;
      const first = table.entries[0];
      assert.ok(first);
      for (const entries of [
        [...table.entries, first],
        [{ ...first, min: 0 }, ...table.entries.slice(1)],
        [{ ...first, max: 21 }, ...table.entries.slice(1)],
      ])
        assert.equal(validateCatalog(modifiedTable({ entries })).ok, false);
    },
  },
  {
    name: 'referências ausentes, raridade e tema incoerentes são rejeitados',
    run() {
      assert.equal(validateCatalog({ ...catalog, items: catalog.items.slice(1) }).ok, false);
      assert.equal(validateCatalog(modifiedTable({ rarity: 'rare' })).ok, false);
      assert.equal(
        validateCatalog({
          ...catalog,
          items: catalog.items.map((candidate) => ({ ...candidate, themes: ['Relics'] })),
        }).ok,
        false,
      );
    },
  },
  {
    name: 'resolução completa com lacuna ou sobreposição é rejeitada',
    run() {
      const resolution = catalog.resolutions[0];
      assert.ok(resolution);
      assert.equal(
        validateCatalog({
          ...catalog,
          resolutions: [
            { ...resolution, entries: resolution.entries.slice(1) },
            ...catalog.resolutions.slice(1),
          ],
        }).ok,
        false,
      );
      assert.equal(
        validateCatalog({
          ...catalog,
          resolutions: [
            { ...resolution, entries: [...resolution.entries, ...resolution.entries] },
            ...catalog.resolutions.slice(1),
          ],
        }).ok,
        false,
      );
    },
  },
  {
    name: 'balanceamento considera histórico apenas da faixa atual',
    run() {
      const result = assessReward({
        level: 5,
        rarity: 'common',
        history: Array.from({ length: 20 }, (_, i) => ({ ...award, id: String(i), partyLevel: 4 })),
        partySize: 8,
      });
      assert.equal(result.accumulated, 0);
      assert.equal(result.reference, 10);
      assert.equal(result.classification, 'withinReference');
    },
  },
  {
    name: 'balanceamento alerta excesso e raridade fora da referência sem bloquear',
    run() {
      assert.equal(
        assessReward({ level: 1, rarity: 'common', history: Array(6).fill(award), partySize: 1 })
          .classification,
        'aboveReference',
      );
      assert.equal(
        assessReward({ level: 1, rarity: 'legendary', history: [], partySize: 10 }).classification,
        'unusual',
      );
      assert.equal(
        assessReward({ level: 1, rarity: 'common', history: [], partySize: 1, proposedCount: 7 })
          .classification,
        'aboveReference',
      );
    },
  },
  {
    name: 'balanceamento diferencia histórico vazio de histórico desconhecido',
    run() {
      assert.equal(
        assessReward({ level: 1, rarity: 'common', history: null, partySize: null }).classification,
        'insufficientData',
      );
      assert.equal(
        assessReward({ level: 1, rarity: 'common', history: [], partySize: null }).classification,
        'withinReference',
      );
    },
  },
  {
    name: 'histórico calcula totais e valida correções',
    run() {
      assert.deepEqual(rarityTotals([award, award, { ...award, rarity: 'rare' }]), {
        common: 2,
        rare: 1,
      });
      assert.equal(validateAward({ ...award, partyLevel: 21 })?.ok, false);
      assert.equal(validateAward({ ...award, valueCopper: -1 })?.ok, false);
    },
  },
];
