import assert from 'node:assert/strict';
import { generateForCampaign } from '../src/modules/treasure/application/generate-for-campaign.ts';
import { buildGenerationConfig } from '../src/modules/treasure/presentation/form-model.ts';
import { createAward } from '../src/modules/treasure/application/award-service.ts';
import { CATEGORIES } from '../src/modules/treasure/domain/models.ts';
import type { GeneratorForm } from '../src/modules/treasure/presentation/form-model.ts';
import type { TestCase } from './domain-cases.ts';
import { campaign, catalog, configuration, dependencies } from './fixtures.ts';
const form: GeneratorForm = {
  level: '1',
  quantity: '1',
  rarityMode: 'automatic',
  manualRarity: 'common',
  theme: 'Arcana',
  mode: 'custom',
  categories: CATEGORIES,
  maxGold: '',
  unknownValuePolicy: 'exclude',
};
export const applicationCases: readonly TestCase[] = [
  {
    name: 'caso de uso avalia o lote inteiro antes da concessão',
    run() {
      const result = generateForCampaign(
        { campaign, catalog, config: { ...configuration, quantity: 7 }, history: [] },
        dependencies(),
      );
      assert.ok(result.ok);
      assert.equal(result.value.treasure.items.length, 7);
      assert.equal(result.value.campaignId, campaign.id);
      const first = result.value.treasure.items[0];
      assert.ok(first);
      assert.equal(result.value.assessments[first.id]?.classification, 'aboveReference');
      const snapshot = createAward(first, {
        id: 'award-test',
        campaignId: campaign.id,
        partyLevel: 3,
        now: campaign.createdAt,
      });
      assert.equal(snapshot.valueCopper, 5000);
      assert.equal(snapshot.partyLevel, 3);
    },
  },
  {
    name: 'formulário fiel remove filtros do procedimento preservando escolha de raridade',
    run() {
      const result = buildGenerationConfig({
        ...form,
        mode: 'faithful',
        categories: ['Potion'],
        maxGold: '1',
        rarityMode: 'manual',
        manualRarity: 'legendary',
      });
      assert.ok(result.ok);
      assert.equal(result.value.maxValueCopper, null);
      assert.deepEqual(result.value.categories, CATEGORIES);
      assert.deepEqual(result.value.rarity, { mode: 'manual', value: 'legendary' });
    },
  },
  {
    name: 'formulário rejeita decimais de nível sem truncar e interpreta PO em cobre',
    run() {
      assert.equal(buildGenerationConfig({ ...form, level: '1.9' }).ok, false);
      assert.equal(buildGenerationConfig({ ...form, quantity: '-1' }).ok, false);
      const result = buildGenerationConfig({ ...form, maxGold: '400,50' });
      assert.ok(result.ok);
      assert.equal(result.value.maxValueCopper, 40050);
    },
  },
];
