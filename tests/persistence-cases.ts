import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { migrateDatabase } from '../src/database/migrations.ts';
import { createCampaignRepository } from '../src/modules/campaigns/infrastructure/sqlite-campaign-repository.ts';
import { createAwardRepository } from '../src/modules/treasure/infrastructure/sqlite-award-repository.ts';
import { openNodeDatabase } from './node-database.ts';
import { award, campaign } from './fixtures.ts';
import type { TestCase } from './domain-cases.ts';
export const persistenceCases: readonly TestCase[] = [
  { name: 'migrações são idempotentes e preservam dados', async run() {
    const database = openNodeDatabase();
    try { await migrateDatabase(database); assert.ok((await createCampaignRepository(database).save(campaign)).ok); await migrateDatabase(database); assert.deepEqual(await createCampaignRepository(database).list(), { ok: true, value: [campaign] }); }
    finally { database.close(); }
  } },
  { name: 'histórico persiste após fechar e reabrir arquivo SQLite', async run() {
    const folder = mkdtempSync(join(tmpdir(), 'dm-companion-')); const path = join(folder, 'test.db');
    let database = openNodeDatabase(path);
    try {
      await migrateDatabase(database); await createCampaignRepository(database).save(campaign);
      assert.ok((await createAwardRepository(database).add([award])).ok); database.close(); database = openNodeDatabase(path);
      await migrateDatabase(database); assert.deepEqual(await createAwardRepository(database).list(campaign.id), { ok: true, value: [award] });
    } finally { database.close(); rmSync(folder, { recursive: true, force: true }); }
  } },
  { name: 'concessão composta reverte tudo em caso de chave estrangeira inválida', async run() {
    const database = openNodeDatabase();
    try { await migrateDatabase(database); await createCampaignRepository(database).save(campaign); const repository = createAwardRepository(database);
      const result = await repository.add([award, { ...award, id: 'bad', campaignId: 'missing' }]); assert.ok(!result.ok); assert.equal(result.error.kind, 'persistence');
      assert.deepEqual(await repository.list(campaign.id), { ok: true, value: [] });
    } finally { database.close(); }
  } },
  { name: 'histórico permite correção e exclusão com isolamento entre campanhas', async run() {
    const database = openNodeDatabase();
    try { await migrateDatabase(database); await createCampaignRepository(database).save(campaign); const repository = createAwardRepository(database); await repository.add([award]);
      assert.equal((await repository.remove(award.id, 'other')).ok, false);
      const updated = { ...award, partyLevel: 5, notes: 'Correção', valueCopper: null };
      assert.ok((await repository.update(updated)).ok); assert.deepEqual(await repository.list(campaign.id), { ok: true, value: [updated] });
      assert.ok((await repository.remove(award.id, campaign.id)).ok); assert.deepEqual(await repository.list(campaign.id), { ok: true, value: [] });
    } finally { database.close(); }
  } },
  { name: 'IDs repetidos não duplicam lote e SQL parametrizado preserva texto', async run() {
    const database = openNodeDatabase();
    try { await migrateDatabase(database); const name = "Campanha '); DROP TABLE campaigns; --"; const changed = { ...campaign, name };
      assert.ok((await createCampaignRepository(database).save(changed)).ok);
      const repository = createAwardRepository(database); assert.ok((await repository.add([award])).ok); assert.equal((await repository.add([award])).ok, false);
      assert.deepEqual(await createCampaignRepository(database).list(), { ok: true, value: [changed] });
      const list = await repository.list(campaign.id); assert.ok(list.ok); assert.equal(list.value.length, 1);
    } finally { database.close(); }
  } },
  { name: 'atualizar grupo preserva recompensas e valida nível antes de gravar', async run() {
    const database = openNodeDatabase();
    try { await migrateDatabase(database); const campaigns = createCampaignRepository(database); await campaigns.save(campaign); const awards = createAwardRepository(database); await awards.add([award]);
      assert.ok((await campaigns.save({ ...campaign, party: { level: 10, characters: [] } })).ok);
      assert.equal((await campaigns.save({ ...campaign, party: { level: 21, characters: [] } })).ok, false);
      assert.deepEqual(await awards.list(campaign.id), { ok: true, value: [award] });
    } finally { database.close(); }
  } },
];
