import assert from 'node:assert/strict';
import { generateTreasure } from '../src/modules/treasure/domain/generator.ts';
import { assessReward } from '../src/modules/treasure/domain/balance.ts';
import { rollDie, LEVEL_BANDS } from '../src/modules/treasure/domain/rules.ts';
import { validateAward } from '../src/modules/treasure/application/award-service.ts';
import { validateCatalog } from '../src/modules/treasure/domain/catalog-validation.ts';
import { calculateItemValue } from '../src/modules/treasure/domain/economy.ts';
import type { TreasureCatalog } from '../src/modules/treasure/domain/models.ts';
import type { TestCase } from './domain-cases.ts';
import { award, catalog, configuration, dependencies, item } from './fixtures.ts';

function jointCatalog(): TreasureCatalog {
  const items = ['a', 'b', 'c'].map((id) => ({
    ...item,
    id,
    category: id === 'c' ? ('Ring' as const) : ('Potion' as const),
  }));
  return {
    schemaVersion: 1,
    items,
    tables: [
      {
        id: 'joint',
        name: 'Probabilidade conjunta',
        theme: 'Arcana',
        rarity: 'common',
        complete: true,
        source: item.source,
        entries: [
          {
            tableId: 'joint',
            min: 1,
            max: 30,
            target: { kind: 'item', itemId: 'a', variant: null },
          },
          {
            tableId: 'joint',
            min: 31,
            max: 100,
            target: { kind: 'resolution', resolutionId: 'secondary' },
          },
        ],
      },
    ],
    resolutions: [
      {
        id: 'secondary',
        name: 'Variante',
        sides: 4,
        complete: true,
        entries: [
          { min: 1, max: 1, target: { kind: 'item', itemId: 'b', variant: null } },
          { min: 2, max: 4, target: { kind: 'item', itemId: 'c', variant: null } },
        ],
      },
    ],
  };
}

export const auditEdgeCases: readonly TestCase[] = [
  {
    name: 'probabilidades: matriz corresponde às quatro referências fornecidas',
    run() {
      assert.deepEqual(
        LEVEL_BANDS.map((band) => [...band.probabilities]),
        [
          [54, 37, 9, 0, 0],
          [30, 51, 17, 2, 0],
          [11, 23, 36, 23, 7],
          [0, 0, 20, 44, 36],
        ],
      );
      assert.deepEqual(
        LEVEL_BANDS.map((band) => [...band.progression]),
        [
          [6, 4, 1, 0, 0],
          [10, 17, 6, 1, 0],
          [3, 7, 11, 7, 2],
          [0, 0, 5, 11, 9],
        ],
      );
    },
  },
  {
    name: 'probabilidades: mistura de entradas diretas e secundárias preserva pesos conjuntos',
    run() {
      const data = jointCatalog();
      for (const [categories, draws, expected] of [
        [['Potion', 'Ring'], 40, { a: 12, b: 7, c: 21 }],
        [['Potion'], 19, { a: 12, b: 7 }],
      ] as const) {
        const counts: Record<string, number> = {};
        for (let draw = 0; draw < draws; draw++) {
          const result = generateTreasure(
            data,
            { ...configuration, categories },
            dependencies([(draw + 0.5) / draws]),
          );
          assert.ok(result.ok);
          const selected = result.value.items[0];
          assert.ok(selected);
          counts[selected.item.id] = (counts[selected.item.id] ?? 0) + 1;
        }
        assert.deepEqual(counts, expected);
      }
    },
  },
  {
    name: 'probabilidades: dado inválido não consome aleatoriedade',
    run() {
      let calls = 0;
      for (const sides of [0, -1, 1.5, NaN, Infinity])
        assert.equal(
          rollDie(sides, () => {
            calls++;
            return 0;
          }).ok,
          false,
        );
      assert.equal(calls, 0);
      assert.deepEqual(
        rollDie(100, () => 0),
        { ok: true, value: 1 },
      );
      assert.deepEqual(
        rollDie(100, () => 1 - Number.EPSILON),
        { ok: true, value: 100 },
      );
    },
  },
  {
    name: 'geração: limite de 100 resultados mantém orçamento por item e IDs únicos',
    run() {
      const result = generateTreasure(
        catalog,
        { ...configuration, quantity: 100, categories: ['Potion'], maxValueCopper: 5000 },
        dependencies(),
      );
      assert.ok(result.ok);
      assert.equal(result.value.items.length, 100);
      assert.equal(new Set(result.value.items.map((item) => item.id)).size, 100);
      assert.ok(
        result.value.items.every(
          (item) => item.value.kind === 'known' && item.value.copper === 5000,
        ),
      );
      assert.equal(
        generateTreasure(catalog, configuration, { ...dependencies(), now: () => 'invalid' }).ok,
        false,
      );
    },
  },
  {
    name: 'catálogo: resolução incompleta, IDs repetidos e nomes vazios são rejeitados',
    run() {
      const resolution = catalog.resolutions[0];
      assert.ok(resolution);
      assert.equal(
        validateCatalog({
          ...catalog,
          resolutions: [{ ...resolution, complete: false }, ...catalog.resolutions.slice(1)],
        }).ok,
        false,
      );
      assert.equal(validateCatalog({ ...catalog, items: [item, ...catalog.items] }).ok, false);
      assert.equal(
        validateCatalog({ ...catalog, items: [{ ...item, name: ' ' }, ...catalog.items.slice(1)] })
          .ok,
        false,
      );
      assert.equal(
        validateCatalog({ ...catalog, resolutions: [resolution, ...catalog.resolutions] }).ok,
        false,
      );
    },
  },
  {
    name: 'economia: zero explícito é conhecido e acréscimo em overflow não cabe no orçamento',
    run() {
      assert.deepEqual(
        calculateItemValue({
          ...item,
          category: 'Scroll',
          pricing: { kind: 'scroll', inscriptionCopper: 0 },
        }),
        { kind: 'known', copper: 0 },
      );
      assert.equal(
        calculateItemValue({ ...item, additionalCostCopper: Number.MAX_SAFE_INTEGER }).kind,
        'unknown',
      );
      const generated = generateTreasure(
        catalog,
        { ...configuration, maxValueCopper: 0, categories: ['Potion'] },
        dependencies(),
      );
      assert.ok(!generated.ok);
      assert.equal(generated.error.kind, 'empty');
    },
  },
  {
    name: 'histórico: todo nome de item autorizado pelo importador pode ser registrado',
    run() {
      assert.equal(validateAward({ ...award, itemName: 'A'.repeat(1000) }), null);
      assert.equal(validateAward({ ...award, itemName: 'A'.repeat(1001) })?.ok, false);
    },
  },
  {
    name: 'balanceamento: nível fracionário no histórico e total inseguro não são avaliados como referência válida',
    run() {
      assert.equal(
        assessReward({
          level: 1,
          rarity: 'common',
          history: [{ ...award, partyLevel: 1.5 }],
          partySize: 4,
        }).classification,
        'insufficientData',
      );
      assert.equal(
        assessReward({
          level: 1,
          rarity: 'common',
          history: [award],
          partySize: 4,
          proposedCount: Number.MAX_SAFE_INTEGER,
        }).classification,
        'insufficientData',
      );
    },
  },
  {
    name: 'balanceamento: referência exata é permitida e tamanho do grupo não altera a classificação',
    run() {
      for (const partySize of [0, 1, 4, 10, null]) {
        const result = assessReward({
          level: 1,
          rarity: 'common',
          history: Array.from({ length: 5 }, (_, index) => ({ ...award, id: String(index) })),
          partySize,
        });
        assert.equal(result.classification, 'withinReference');
        assert.match(result.explanation, /não é um limite rígido/);
        assert.match(result.warnings.join(' '), /poder equivalente/);
      }
    },
  },
];
