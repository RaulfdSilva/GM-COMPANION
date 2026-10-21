import assert from 'node:assert/strict';
import { createAppController } from '../src/application/app-controller.ts';
import type { AppServices } from '../src/application/app-services.ts';
import type { Campaign } from '../src/modules/campaigns/domain/models.ts';
import type { TreasureAward } from '../src/modules/treasure/domain/models.ts';
import { failure, success } from '../src/shared/types/result.ts';
import type { Result } from '../src/shared/types/result.ts';
import type { TestCase } from './domain-cases.ts';
import { award, campaign, catalog, configuration, dependencies } from './fixtures.ts';

function fixture() {
  let campaigns: readonly Campaign[] = [campaign, { ...campaign, id: 'second', name: 'Segunda' }];
  let awards: readonly TreasureAward[] = [];
  const faults = { read: false, write: false };
  const calls = { add: 0, update: 0, remove: 0, close: 0, import: 0 };
  const services: AppServices = {
    campaigns: {
      async list() {
        return success(campaigns);
      },
      async save(changed) {
        campaigns = [...campaigns.filter((entry) => entry.id !== changed.id), changed];
        return success(changed);
      },
    },
    awards: {
      async list(id) {
        return faults.read
          ? failure('persistence', 'Consulta indisponível.')
          : success(awards.filter((award) => award.campaignId === id));
      },
      async add(changed) {
        calls.add++;
        if (faults.write) return failure('persistence', 'Gravação indisponível.');
        awards = [...awards, ...changed];
        return success(undefined);
      },
      async update(changed) {
        calls.update++;
        awards = awards.map((award) => (award.id === changed.id ? changed : award));
        return success(undefined);
      },
      async remove(id) {
        calls.remove++;
        awards = awards.filter((award) => award.id !== id);
        return success(undefined);
      },
    },
    catalogs: {
      async list() {
        return success([]);
      },
      async save(record) {
        calls.import++;
        return success(record);
      },
    },
    originalCatalog: { id: 'demo', name: 'Demonstração', catalog },
    parseCatalog: () => success(catalog),
    async close() {
      calls.close++;
    },
  };
  const controller = createAppController(async () => success(services), dependencies());
  return { controller, services, faults, calls };
}

function deferred<T>() {
  let resolve: (value: T) => void = () => {
    throw new Error('Promise não inicializada.');
  };
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

export const controllerCases: readonly TestCase[] = [
  {
    name: 'sessão: falha inicial preserva o tipo do erro e fecha a conexão',
    async run() {
      const f = fixture();
      const services: AppServices = {
        ...f.services,
        catalogs: {
          ...f.services.catalogs,
          async list() {
            return failure('validation', 'Catálogo corrompido.');
          },
        },
      };
      const controller = createAppController(async () => success(services), dependencies());
      await controller.start();
      assert.equal(controller.getSnapshot().ready, false);
      assert.equal(controller.getSnapshot().error?.kind, 'validation');
      assert.equal(f.calls.close, 1);
    },
  },
  {
    name: 'sessão: falha de abertura não fabrica campanha nem histórico',
    async run() {
      const controller = createAppController(
        async () => failure('persistence', 'Banco indisponível.'),
        dependencies(),
      );
      await controller.start();
      assert.equal(controller.getSnapshot().error?.kind, 'persistence');
      assert.equal(controller.getSnapshot().session.historyAvailable, false);
      assert.deepEqual(controller.getSnapshot().session.campaigns, []);
    },
  },
  {
    name: 'sessão: falha de escrita não marca itens como concedidos',
    async run() {
      const f = fixture();
      await f.controller.start();
      assert.ok(f.controller.actions.generate(configuration));
      const id = f.controller.getSnapshot().generation?.treasure.items[0]?.id;
      assert.ok(id);
      f.faults.write = true;
      assert.equal(await f.controller.actions.awardItems([id]), false);
      assert.deepEqual(f.controller.getSnapshot().awardedIds, []);
      assert.equal(f.controller.getSnapshot().error?.kind, 'persistence');
      await f.controller.dispose();
    },
  },
  {
    name: 'sessão: recarga falha após concessão confirma a gravação e sinaliza histórico insuficiente',
    async run() {
      const f = fixture();
      await f.controller.start();
      assert.ok(f.controller.actions.generate(configuration));
      const id = f.controller.getSnapshot().generation?.treasure.items[0]?.id;
      assert.ok(id);
      f.faults.read = true;
      assert.equal(await f.controller.actions.awardItems([id]), true);
      assert.match(f.controller.getSnapshot().error?.message ?? '', /foi salva/);
      assert.equal(f.controller.getSnapshot().session.historyAvailable, false);
      assert.deepEqual(f.controller.getSnapshot().awardedIds, [id]);
      assert.equal(await f.controller.actions.awardItems([id]), false);
      assert.equal(f.calls.add, 1);
      assert.ok(f.controller.actions.generate(configuration));
      assert.equal(
        Object.values(f.controller.getSnapshot().generation?.assessments ?? {})[0]?.classification,
        'insufficientData',
      );
      f.faults.read = false;
      assert.ok(await f.controller.actions.chooseCampaign(campaign.id));
      assert.equal(f.controller.getSnapshot().session.historyAvailable, true);
      assert.equal(f.controller.getSnapshot().session.awards.length, 1);
      await f.controller.dispose();
    },
  },
  {
    name: 'sessão: erro após possível COMMIT não mantém histórico como referência conclusiva',
    async run() {
      const f = fixture();
      const services: AppServices = {
        ...f.services,
        awards: {
          ...f.services.awards,
          async add(awards) {
            await f.services.awards.add(awards);
            return failure('persistence', 'A transação foi confirmada; falha no fechamento.');
          },
        },
      };
      const controller = createAppController(async () => success(services), dependencies());
      await controller.start();
      controller.actions.generate(configuration);
      const id = controller.getSnapshot().generation?.treasure.items[0]?.id;
      assert.ok(id);
      assert.equal(await controller.actions.awardItems([id]), false);
      assert.equal(controller.getSnapshot().session.historyAvailable, false);
      controller.actions.generate(configuration);
      assert.equal(
        Object.values(controller.getSnapshot().generation?.assessments ?? {})[0]?.classification,
        'insufficientData',
      );
      assert.ok(await controller.actions.chooseCampaign(campaign.id));
      assert.equal(controller.getSnapshot().session.awards.length, 1);
      await controller.dispose();
    },
  },
  {
    name: 'sessão: erro de validação na recarga mantém sua classe após escrita confirmada',
    async run() {
      const f = fixture();
      let reads = 0;
      const services: AppServices = {
        ...f.services,
        awards: {
          ...f.services.awards,
          async list() {
            return ++reads === 1 ? success([]) : failure('validation', 'Registro corrompido.');
          },
        },
      };
      const controller = createAppController(async () => success(services), dependencies());
      await controller.start();
      controller.actions.generate(configuration);
      const id = controller.getSnapshot().generation?.treasure.items[0]?.id;
      assert.ok(id);
      assert.ok(await controller.actions.awardItems([id]));
      assert.equal(controller.getSnapshot().error?.kind, 'validation');
      assert.equal(controller.getSnapshot().session.historyAvailable, false);
      await controller.dispose();
    },
  },
  {
    name: 'sessão: correção e exclusão de outra campanha são rejeitadas antes da escrita',
    async run() {
      const f = fixture();
      await f.controller.start();
      const other = { ...award, campaignId: 'second' };
      assert.equal(await f.controller.actions.updateAward(other), false);
      assert.equal(await f.controller.actions.removeAward(other), false);
      assert.equal(f.calls.update, 0);
      assert.equal(f.calls.remove, 0);
      assert.equal(f.controller.getSnapshot().session.activeId, campaign.id);
      await f.controller.dispose();
    },
  },
  {
    name: 'sessão: seleção inválida não altera campanha ou catálogo atuais',
    async run() {
      const f = fixture();
      await f.controller.start();
      assert.equal(await f.controller.actions.chooseCampaign('unknown'), false);
      f.controller.actions.chooseCatalog('unknown');
      assert.equal(f.controller.getSnapshot().session.activeId, campaign.id);
      assert.equal(f.controller.getSnapshot().catalogId, 'demo');
      await f.controller.dispose();
    },
  },
  {
    name: 'sessão: trocar campanha limpa resultados e concede histórico da campanha selecionada',
    async run() {
      const f = fixture();
      await f.controller.start();
      f.controller.actions.generate(configuration);
      assert.ok(await f.controller.actions.chooseCampaign('second'));
      assert.equal(f.controller.getSnapshot().generation, null);
      assert.deepEqual(f.controller.getSnapshot().session.awards, []);
      await f.controller.dispose();
    },
  },
  {
    name: 'sessão: seleção parcialmente inválida não salva um subconjunto silencioso',
    async run() {
      const f = fixture();
      await f.controller.start();
      f.controller.actions.generate(configuration);
      const id = f.controller.getSnapshot().generation?.treasure.items[0]?.id;
      assert.ok(id);
      assert.equal(await f.controller.actions.awardItems([id, 'unknown']), false);
      assert.equal(await f.controller.actions.awardItems([id, id]), false);
      assert.equal(f.calls.add, 0);
      await f.controller.dispose();
    },
  },
  {
    name: 'sessão: edição de campanha salva não é apresentada como falha se a recarga falhar',
    async run() {
      const f = fixture();
      await f.controller.start();
      f.faults.read = true;
      assert.ok(await f.controller.actions.saveParty({ ...campaign, name: 'Nome corrigido' }));
      assert.equal(
        f.controller.getSnapshot().session.campaigns.find((entry) => entry.id === campaign.id)
          ?.name,
        'Nome corrigido',
      );
      assert.equal(f.controller.getSnapshot().session.historyAvailable, false);
      await f.controller.dispose();
    },
  },
  {
    name: 'sessão: operações concorrentes e sorteios durante escrita são bloqueados',
    async run() {
      const f = fixture();
      const pending = deferred<Result<Campaign>>();
      const controller = createAppController(
        async () =>
          success({
            ...f.services,
            campaigns: { ...f.services.campaigns, save: () => pending.promise },
          }),
        dependencies(),
      );
      await controller.start();
      const saving = controller.actions.saveParty(campaign);
      assert.equal(controller.getSnapshot().busy, true);
      assert.equal(await controller.actions.chooseCampaign('second'), false);
      assert.equal(controller.actions.generate(configuration), false);
      pending.resolve(success(campaign));
      assert.equal(await saving, true);
      assert.equal(controller.getSnapshot().busy, false);
      await controller.dispose();
    },
  },
  {
    name: 'sessão: desmontagem aguarda escrita e ignora sua atualização tardia',
    async run() {
      const f = fixture();
      const pending = deferred<Result<Campaign>>();
      const controller = createAppController(
        async () =>
          success({
            ...f.services,
            campaigns: { ...f.services.campaigns, save: () => pending.promise },
          }),
        dependencies(),
      );
      await controller.start();
      const saving = controller.actions.saveParty({ ...campaign, name: 'Tardio' });
      const disposing = controller.dispose();
      assert.equal(f.calls.close, 0);
      pending.resolve(success({ ...campaign, name: 'Tardio' }));
      assert.equal(await saving, false);
      await disposing;
      assert.equal(f.calls.close, 1);
      assert.equal(controller.getSnapshot().ready, false);
      assert.equal(controller.getSnapshot().session.campaigns[0]?.name, campaign.name);
    },
  },
  {
    name: 'sessão: inicialização desmontada fecha recursos sem publicar estado tardio',
    async run() {
      const f = fixture();
      const pending = deferred<Result<AppServices>>();
      const controller = createAppController(() => pending.promise, dependencies());
      const starting = controller.start();
      await controller.dispose();
      pending.resolve(success(f.services));
      await starting;
      assert.equal(controller.getSnapshot().ready, false);
      assert.equal(f.calls.close, 1);
    },
  },
  {
    name: 'sessão: excluir concessão permite registrar novamente o resultado ainda ativo',
    async run() {
      const f = fixture();
      await f.controller.start();
      f.controller.actions.generate(configuration);
      const id = f.controller.getSnapshot().generation?.treasure.items[0]?.id;
      assert.ok(id);
      assert.ok(await f.controller.actions.awardItems([id]));
      const saved = f.controller.getSnapshot().session.awards[0];
      assert.ok(saved);
      assert.ok(await f.controller.actions.removeAward(saved));
      assert.deepEqual(f.controller.getSnapshot().awardedIds, []);
      assert.ok(await f.controller.actions.awardItems([id]));
      await f.controller.dispose();
    },
  },
  {
    name: 'sessão: importação inválida não é salva nem substitui o catálogo ativo',
    async run() {
      const f = fixture();
      const controller = createAppController(
        async () =>
          success({ ...f.services, parseCatalog: () => failure('validation', 'JSON inválido.') }),
        dependencies(),
      );
      await controller.start();
      assert.equal(await controller.actions.importText('{', 'arquivo.json'), false);
      assert.equal(f.calls.import, 0);
      assert.equal(controller.getSnapshot().catalogId, 'demo');
      await controller.dispose();
    },
  },
];
