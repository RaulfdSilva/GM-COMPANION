import assert from 'node:assert/strict';
import { migrateDatabase } from '../src/database/migrations.ts';
import { createAwardRepository } from '../src/modules/treasure/infrastructure/sqlite-award-repository.ts';
import { createCampaignRepository } from '../src/modules/campaigns/infrastructure/sqlite-campaign-repository.ts';
import { createSqliteDatabase } from '../src/database/sqlite-database.ts';
import type { ClosableSqlConnection } from '../src/database/sqlite-database.ts';
import type { TestCase } from './domain-cases.ts';
import { openNodeDatabase } from './node-database.ts';
import { award, campaign } from './fixtures.ts';

export const auditPersistenceCases: readonly TestCase[] = [
  {
    name: 'SQLite: cada conexão de transação habilita FK antes de BEGIN',
    async run() {
      const database = openNodeDatabase();
      try {
        await migrateDatabase(database);
        await database.execAsync('PRAGMA foreign_keys = OFF');
        const pragma = await database.transaction((connection) => connection.getFirstAsync<{ foreign_keys: number }>('PRAGMA foreign_keys'));
        assert.equal(pragma?.foreign_keys, 1);
        const result = await createAwardRepository(database).add([{ ...award, campaignId: 'missing' }]);
        assert.ok(!result.ok); assert.equal(result.error.kind, 'persistence');
        assert.deepEqual(await database.getAllAsync('SELECT id FROM treasure_awards'), []);
      } finally { database.close(); }
    },
  },
  {
    name: 'SQLite: leitura fora da transação não observa gravação ainda não confirmada',
    async run() {
      const database = openNodeDatabase();
      try {
        await migrateDatabase(database);
        await assert.rejects(database.transaction(async (connection) => {
          await connection.runAsync('INSERT INTO campaigns (id,name,level,created_at) VALUES (?,?,?,?)', campaign.id, campaign.name, campaign.party.level, campaign.createdAt);
          assert.deepEqual(await database.getAllAsync('SELECT id FROM campaigns'), []);
          throw new Error('Reverter');
        }), /Reverter/);
        assert.deepEqual(await database.getAllAsync('SELECT id FROM campaigns'), []);
      } finally { database.close(); }
    },
  },
  {
    name: 'SQLite: erro ao substituir personagens reverte nome, nível e exclusões',
    async run() {
      const database = openNodeDatabase();
      try {
        await migrateDatabase(database);
        const repository = createCampaignRepository(database);
        assert.ok((await repository.save(campaign)).ok);
        const second = { ...campaign, id: 'second', party: { level: 1, characters: [{ id: 'occupied', name: 'Outro' }] } };
        assert.ok((await repository.save(second)).ok);
        const changed = { ...campaign, name: 'Não deve salvar', party: { level: 5, characters: [{ id: 'occupied', name: 'Inválido' }] } };
        assert.equal((await repository.save(changed)).ok, false);
        const listed = await repository.list(); assert.ok(listed.ok);
        assert.deepEqual(listed.value.find((entry) => entry.id === campaign.id), campaign);
      } finally { database.close(); }
    },
  },
  {
    name: 'SQLite: downgrade de banco é recusado sem remover registros',
    async run() {
      const database = openNodeDatabase();
      try {
        await migrateDatabase(database); await createCampaignRepository(database).save(campaign);
        await database.execAsync('PRAGMA user_version = 99');
        await assert.rejects(migrateDatabase(database), /versão mais recente/);
        const current = await database.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
        assert.equal(current?.user_version, 99);
        const listed = await createCampaignRepository(database).list();
        assert.ok(listed.ok); assert.equal(listed.value.length, 1);
      } finally { database.close(); }
    },
  },
  {
    name: 'SQLite: histórico corrompido não é entregue como dados válidos à UI',
    async run() {
      const database = openNodeDatabase();
      try {
        await migrateDatabase(database); await createCampaignRepository(database).save(campaign);
        const repository = createAwardRepository(database); await repository.add([award]);
        await database.runAsync('UPDATE treasure_awards SET party_level = ? WHERE id = ?', 1.5, award.id);
        const listed = await repository.list(campaign.id);
        assert.ok(!listed.ok); assert.equal(listed.error.kind, 'validation');
      } finally { database.close(); }
    },
  },
  {
    name: 'SQLite: nomes normalizados retornados por save correspondem à leitura',
    async run() {
      const database = openNodeDatabase();
      try {
        await migrateDatabase(database);
        const repository = createCampaignRepository(database);
        const saved = await repository.save({ ...campaign, name: '  Nome  ', party: { ...campaign.party,
          characters: campaign.party.characters.map((character) => ({ ...character, name: '  Ari  ' })) } });
        const listed = await repository.list(); assert.ok(saved.ok && listed.ok);
        assert.deepEqual(saved.value, listed.value[0]);
      } finally { database.close(); }
    },
  },
  {
    name: 'SQLite: salvar campanha preserva e retorna sua data de criação original',
    async run() {
      const database = openNodeDatabase();
      try {
        await migrateDatabase(database); const repository = createCampaignRepository(database);
        await repository.save(campaign);
        const changed = await repository.save({ ...campaign, createdAt: '2026-11-01T00:00:00.000Z' });
        assert.ok(changed.ok); assert.equal(changed.value.createdAt, campaign.createdAt);
      } finally { database.close(); }
    },
  },
  {
    name: 'SQLite: datas com fusos são normalizadas e ordenadas pelo instante real',
    async run() {
      const database = openNodeDatabase();
      try {
        await migrateDatabase(database); await createCampaignRepository(database).save(campaign);
        const repository = createAwardRepository(database);
        await repository.add([{ ...award, id: 'early', awardedAt: '2026-10-19T11:00:00+03:00' }, { ...award, id: 'late', awardedAt: '2026-10-19T09:00:00Z' }]);
        const listed = await repository.list(campaign.id); assert.ok(listed.ok);
        assert.deepEqual(listed.value.map((entry) => entry.id), ['late', 'early']);
        assert.equal(listed.value[1]?.awardedAt, '2026-10-19T08:00:00.000Z');
      } finally { database.close(); }
    },
  },
  {
    name: 'SQLite: falha no fechamento não esconde a causa da operação',
    async run() {
      const connection: ClosableSqlConnection = {
        async execAsync() {}, async runAsync() { return { changes: 0 }; },
        async getAllAsync() { return []; }, async getFirstAsync() { return null; },
        async closeAsync() { throw new Error('close-failure'); },
      };
      const database = createSqliteDatabase(connection, async () => connection);
      await assert.rejects(database.transaction(async () => { throw new Error('original-failure'); }), /original-failure.*close-failure/s);
    },
  },
];
