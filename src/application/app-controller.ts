import type { Campaign } from '../modules/campaigns/domain/models.ts';
import { saveCampaign } from '../modules/campaigns/application/campaign-service.ts';
import { createAward } from '../modules/treasure/application/award-service.ts';
import type { StoredCatalog } from '../modules/treasure/application/catalog-repository.ts';
import { generateForCampaign } from '../modules/treasure/application/generate-for-campaign.ts';
import type { GenerationView } from '../modules/treasure/application/generate-for-campaign.ts';
import type { GenerationDependencies } from '../modules/treasure/domain/generator.ts';
import type { TreasureAward, TreasureGenerationConfig } from '../modules/treasure/domain/models.ts';
import { errorMessage, success } from '../shared/types/result.ts';
import type { AppError, Result } from '../shared/types/result.ts';
import type { AppServices, OpenAppServices } from './app-services.ts';

export type Session = Readonly<{
  campaigns: readonly Campaign[];
  activeId: string | null;
  awards: readonly TreasureAward[];
  historyAvailable: boolean;
}>;

export type AppState = Readonly<{
  ready: boolean;
  busy: boolean;
  error: AppError | null;
  session: Session;
  catalogs: readonly StoredCatalog[];
  catalogId: string;
  generation: GenerationView | null;
  awardedIds: readonly string[];
}>;

type Outcome = Readonly<{ success: boolean; changes: Partial<AppState> }>;
const rejected = (error: AppError): Outcome => ({ success: false, changes: { error } });
function rejectedWrite(error: AppError, snapshot: AppState): Outcome {
  const uncertain = error.kind === 'persistence' || error.kind === 'unavailable';
  return { success: false, changes: { error,
    ...(uncertain ? { session: { ...snapshot.session, historyAvailable: false } } : {}) } };
}
const validationError = (message: string): AppError => ({ kind: 'validation', message });

async function loadSession(services: AppServices): Promise<Result<{
  session: Session;
  catalogs: readonly StoredCatalog[];
}>> {
  const campaigns = await services.campaigns.list();
  if (!campaigns.ok) return campaigns;
  const catalogs = await services.catalogs.list();
  if (!catalogs.ok) return catalogs;
  const first = campaigns.value[0];
  const awards = first ? await services.awards.list(first.id) : success([]);
  if (!awards.ok) return awards;
  return success({
    session: { campaigns: campaigns.value, activeId: first?.id ?? null, awards: awards.value, historyAvailable: true },
    catalogs: [services.originalCatalog, ...catalogs.value],
  });
}

async function afterWrite(
  services: AppServices,
  session: Session,
  changes: Partial<AppState> = {},
): Promise<Outcome> {
  let loaded: Result<readonly TreasureAward[]>;
  try {
    loaded = await services.awards.list(session.activeId ?? '');
  } catch (cause) {
    loaded = { ok: false, error: { kind: 'persistence', message: errorMessage(cause) } };
  }
  return loaded.ok
    ? { success: true, changes: { ...changes, session: { ...session, awards: loaded.value, historyAvailable: true } } }
    : {
        success: true,
        changes: {
          ...changes,
          session: { ...session, historyAvailable: false },
          error: {
            kind: loaded.error.kind,
            message: 'A alteração foi salva, mas o histórico não pôde ser atualizado. Selecione a campanha novamente para recarregar.',
            details: [loaded.error.message, ...(loaded.error.details ?? [])],
          },
        },
      };
}

/** Owns session transitions; React only subscribes and renders snapshots. */
export function createAppController(open: OpenAppServices, dependencies: GenerationDependencies) {
  let state: AppState = {
    ready: false, busy: false, error: null,
    session: { campaigns: [], activeId: null, awards: [], historyAvailable: false },
    catalogs: [], catalogId: 'demo', generation: null, awardedIds: [],
  };
  let services: AppServices | null = null;
  let revision = 0;
  let activeOperation: Promise<boolean> | null = null;
  const listeners = new Set<() => void>();

  function publish(changes: Partial<AppState>) {
    state = { ...state, ...changes };
    for (const listener of listeners) listener();
  }

  async function start(): Promise<void> {
    if (state.ready || state.busy) return;
    const currentRevision = ++revision;
    publish({ busy: true, error: null });
    let candidate: AppServices | null = null;
    try {
      const opened = await open();
      if (!opened.ok) {
        if (revision === currentRevision) publish({ error: opened.error });
        return;
      }
      candidate = opened.value;
      const loaded = await loadSession(candidate);
      if (revision !== currentRevision) return;
      if (!loaded.ok) { publish({ error: loaded.error }); return; }
      services = candidate;
      candidate = null;
      publish({ ready: true, ...loaded.value, catalogId: services.originalCatalog.id, generation: null, awardedIds: [] });
    } catch (cause) {
      if (revision === currentRevision) {
        publish({ error: { kind: 'unavailable', message: 'Não foi possível iniciar o aplicativo.', details: [errorMessage(cause)] } });
      }
    } finally {
      if (candidate) {
        try { await candidate.close(); }
        catch (cause) {
          if (revision === currentRevision) {
            publish({ error: { kind: 'persistence', message: 'A inicialização falhou e não foi possível fechar a conexão.', details: [state.error?.message ?? '', errorMessage(cause)] } });
          }
        }
      }
      if (revision === currentRevision) publish({ busy: false });
    }
  }

  async function perform(work: (services: AppServices, snapshot: AppState) => Promise<Outcome>): Promise<boolean> {
    if (!services || state.busy) return false;
    const currentServices = services;
    const currentRevision = revision;
    const snapshot = state;
    publish({ busy: true, error: null });
    const operation = (async () => {
      try {
        const outcome = await work(currentServices, snapshot);
        if (revision !== currentRevision) return false;
        publish(outcome.changes);
        return outcome.success;
      } catch (cause) {
        if (revision === currentRevision) {
          publish({ error: { kind: 'unavailable', message: 'Não foi possível concluir a operação.', details: [errorMessage(cause)] } });
        }
        return false;
      } finally {
        if (revision === currentRevision) publish({ busy: false });
      }
    })();
    activeOperation = operation;
    try { return await operation; }
    finally { if (activeOperation === operation) activeOperation = null; }
  }

  const actions = {
    retry: () => { void start(); },
    clearError: () => publish({ error: null }),
    reportError: (error: AppError) => publish({ error }),
    chooseCatalog(id: string) {
      if (state.busy) return;
      if (!state.catalogs.some((catalog) => catalog.id === id)) {
        publish({ error: validationError('Selecione um catálogo válido.') });
        return;
      }
      publish({ catalogId: id, generation: null, awardedIds: [], error: null });
    },
    chooseCampaign(id: string) {
      return perform(async (services, snapshot) => {
        if (!snapshot.session.campaigns.some((campaign) => campaign.id === id)) {
          return rejected(validationError('Campanha não encontrada.'));
        }
        const awards = await services.awards.list(id);
        if (!awards.ok) return rejected(awards.error);
        return { success: true, changes: {
          session: { ...snapshot.session, activeId: id, awards: awards.value, historyAvailable: true },
          generation: null, awardedIds: [],
        } };
      });
    },
    saveParty(campaign: Campaign) {
      return perform(async (services, snapshot) => {
        const saved = await saveCampaign(services.campaigns, campaign);
        if (!saved.ok) return rejectedWrite(saved.error, snapshot);
        const exists = snapshot.session.campaigns.some((entry) => entry.id === saved.value.id);
        const campaigns = exists
          ? snapshot.session.campaigns.map((entry) => entry.id === saved.value.id ? saved.value : entry)
          : [...snapshot.session.campaigns, saved.value];
        const session = { ...snapshot.session, campaigns, activeId: saved.value.id,
          awards: snapshot.session.activeId === saved.value.id ? snapshot.session.awards : [] };
        return afterWrite(services, session, { generation: null, awardedIds: [] });
      });
    },
    generate(config: TreasureGenerationConfig): boolean {
      if (!services || state.busy) return false;
      const campaign = state.session.campaigns.find((entry) => entry.id === state.session.activeId);
      const catalog = state.catalogs.find((entry) => entry.id === state.catalogId);
      if (!campaign || !catalog) {
        publish({ error: validationError('Selecione uma campanha e um catálogo válidos.') });
        return false;
      }
      try {
        const result = generateForCampaign({ campaign, catalog: catalog.catalog, config,
          history: state.session.historyAvailable ? state.session.awards : null }, dependencies);
        if (!result.ok) { publish({ error: result.error }); return false; }
        publish({ generation: result.value, awardedIds: [], error: null });
        return true;
      } catch (cause) {
        publish({ error: { kind: 'unavailable', message: 'Não foi possível realizar o sorteio.', details: [errorMessage(cause)] } });
        return false;
      }
    },
    awardItems(ids: readonly string[]) {
      return perform(async (services, snapshot) => {
        const generated = snapshot.generation;
        if (!generated || snapshot.session.activeId !== generated.campaignId) {
          return rejected(validationError('O resultado não pertence à campanha selecionada.'));
        }
        const selected = generated.treasure.items.filter((item) => ids.includes(item.id) && !snapshot.awardedIds.includes(item.id));
        if (!ids.length || new Set(ids).size !== ids.length || selected.length !== ids.length) {
          return rejected(validationError('Selecione apenas itens existentes que ainda não foram registrados.'));
        }
        const awards = selected.map((item) => createAward(item, { id: item.id,
          campaignId: generated.campaignId, partyLevel: generated.treasure.config.level, now: dependencies.now() }));
        const result = await services.awards.add(awards);
        if (!result.ok) return rejectedWrite(result.error, snapshot);
        return afterWrite(services, { ...snapshot.session, awards: [...awards, ...snapshot.session.awards] },
          { awardedIds: [...snapshot.awardedIds, ...ids] });
      });
    },
    updateAward(award: TreasureAward) {
      return perform(async (services, snapshot) => {
        if (snapshot.session.activeId !== award.campaignId) return rejected(validationError('O registro pertence a outra campanha.'));
        const result = await services.awards.update(award);
        if (!result.ok) return rejectedWrite(result.error, snapshot);
        return afterWrite(services, { ...snapshot.session,
          awards: snapshot.session.awards.map((entry) => entry.id === award.id ? award : entry) });
      });
    },
    removeAward(award: TreasureAward) {
      return perform(async (services, snapshot) => {
        if (snapshot.session.activeId !== award.campaignId) return rejected(validationError('O registro pertence a outra campanha.'));
        const result = await services.awards.remove(award.id, award.campaignId);
        if (!result.ok) return rejectedWrite(result.error, snapshot);
        return afterWrite(services, { ...snapshot.session, awards: snapshot.session.awards.filter((entry) => entry.id !== award.id) },
          { awardedIds: snapshot.awardedIds.filter((id) => id !== award.id) });
      });
    },
    importText(text: string, name: string) {
      return perform(async (services, snapshot) => {
        const parsed = services.parseCatalog(text);
        if (!parsed.ok) return rejected(parsed.error);
        const saved = await services.catalogs.save({ id: dependencies.id(), name, catalog: parsed.value });
        if (!saved.ok) return rejected(saved.error);
        return { success: true, changes: { catalogs: [...snapshot.catalogs, saved.value],
          catalogId: saved.value.id, generation: null, awardedIds: [] } };
      });
    },
  };

  return {
    actions,
    start,
    getSnapshot: () => state,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    async dispose(): Promise<void> {
      const currentRevision = ++revision;
      const closing = services;
      services = null;
      publish({ ready: false, busy: false });
      if (activeOperation) await activeOperation;
      try { await closing?.close(); }
      catch (cause) {
        if (revision === currentRevision) publish({ error: { kind: 'persistence', message: 'Não foi possível fechar o banco.', details: [errorMessage(cause)] } });
      }
    },
  };
}
