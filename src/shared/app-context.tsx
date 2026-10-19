import { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { PropsWithChildren } from 'react';
import { randomUUID } from 'expo-crypto';
import { openAppDatabase } from '../database/expo-database';
import type { Campaign } from '../modules/campaigns/domain/models';
import { createCampaignRepository } from '../modules/campaigns/infrastructure/sqlite-campaign-repository';
import { saveCampaign } from '../modules/campaigns/application/campaign-service';
import { createAwardRepository } from '../modules/treasure/infrastructure/sqlite-award-repository';
import { createCatalogRepository } from '../modules/treasure/infrastructure/sqlite-catalog-repository';
import type { StoredCatalog } from '../modules/treasure/infrastructure/sqlite-catalog-repository';
import { importCatalog, importCatalogText } from '../modules/treasure/infrastructure/catalog-importer';
import demo from '../modules/treasure/infrastructure/data/demo-catalog.json';
import { generateForCampaign } from '../modules/treasure/application/generate-for-campaign';
import type { GenerationView } from '../modules/treasure/application/generate-for-campaign';
import { createAward } from '../modules/treasure/application/award-service';
import type { TreasureAward, TreasureGenerationConfig } from '../modules/treasure/domain/models';
import { errorMessage } from './types/result';
import type { AppError, Result } from './types/result';

type Repositories = {
  campaigns: ReturnType<typeof createCampaignRepository>;
  awards: ReturnType<typeof createAwardRepository>;
  catalogs: ReturnType<typeof createCatalogRepository>;
};
type Session = Readonly<{ campaigns: readonly Campaign[]; activeId: string | null; awards: readonly TreasureAward[] }>;
type Controller = Readonly<{
  ready: boolean; busy: boolean; error: AppError | null; session: Session;
  campaign: Campaign | null; catalogs: readonly StoredCatalog[]; catalogId: string;
  generation: GenerationView | null; awardedIds: readonly string[];
  retry: () => void; clearError: () => void; reportError: (error: AppError) => void;
  chooseCampaign: (id: string) => Promise<boolean>; chooseCatalog: (id: string) => void;
  saveParty: (campaign: Campaign) => Promise<boolean>;
  generate: (config: TreasureGenerationConfig) => boolean;
  awardItems: (ids: readonly string[]) => Promise<boolean>;
  updateAward: (award: TreasureAward) => Promise<boolean>;
  removeAward: (award: TreasureAward) => Promise<boolean>;
  importText: (text: string, name: string) => Promise<boolean>;
}>;
const AppContext = createContext<Controller | null>(null);
const emptySession: Session = { campaigns: [], activeId: null, awards: [] };
const requireResult = <T,>(result: Result<T>): T => {
  if (!result.ok) throw new Error(`${result.error.message} ${(result.error.details ?? []).join(' ')}`);
  return result.value;
};
export function AppProvider({ children }: PropsWithChildren) {
  const [repositories, setRepositories] = useState<Repositories | null>(null);
  const [session, setSession] = useState<Session>(emptySession);
  const [catalogs, setCatalogs] = useState<readonly StoredCatalog[]>([]);
  const [catalogId, setCatalogId] = useState('demo');
  const [generation, setGeneration] = useState<GenerationView | null>(null);
  const [awardedIds, setAwardedIds] = useState<readonly string[]>([]);
  const [error, setError] = useState<AppError | null>(null);
  const [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const operationInProgress = useRef(false);
  const campaign = session.campaigns.find((entry) => entry.id === session.activeId) ?? null;
  useEffect(() => {
    let mounted = true;
    async function initialize() {
      setError(null);
      try {
        const database = await openAppDatabase();
        const services: Repositories = { campaigns: createCampaignRepository(database), awards: createAwardRepository(database), catalogs: createCatalogRepository(database) };
        const original = requireResult(importCatalog(demo));
        const campaignList = requireResult(await services.campaigns.list());
        const imported = requireResult(await services.catalogs.list());
        const first = campaignList[0];
        const awards = first ? requireResult(await services.awards.list(first.id)) : [];
        if (mounted) {
          setCatalogs([{ id: 'demo', name: 'Demonstração original • CC0', catalog: original }, ...imported]);
          setSession({ campaigns: campaignList, activeId: first?.id ?? null, awards });
          setRepositories(services);
        }
      } catch (cause) {
        if (mounted) setError({ kind: 'unavailable', message: 'Não foi possível iniciar o banco ou validar os dados. Tente novamente; os dados existentes foram preservados.', details: [errorMessage(cause)] });
      }
    }
    void initialize();
    return () => { mounted = false; };
  }, [attempt]);
  async function perform(work: (services: Repositories) => Promise<boolean>): Promise<boolean> {
    if (!repositories || operationInProgress.current) return false;
    operationInProgress.current = true; setBusy(true); setError(null);
    try { return await work(repositories); }
    catch (cause) { setError({ kind: 'unavailable', message: 'Não foi possível concluir a operação.', details: [errorMessage(cause)] }); return false; }
    finally { operationInProgress.current = false; setBusy(false); }
  }
  function accept<T>(result: Result<T>): result is Readonly<{ ok: true; value: T }> {
    if (!result.ok) { setError(result.error); return false; } return true;
  }
  async function reloadAwards(services: Repositories, campaignId: string): Promise<boolean> {
    const result = await services.awards.list(campaignId);
    if (!accept(result)) return false;
    setSession((previous) => ({ ...previous, awards: result.value }));
    return true;
  }
  const controller: Controller = {
    ready: repositories !== null, busy, error, session, campaign, catalogs, catalogId, generation, awardedIds,
    retry: () => setAttempt((previous) => previous + 1), clearError: () => setError(null), reportError: setError,
    chooseCatalog(id) { if (busy) return; setCatalogId(id); setGeneration(null); setAwardedIds([]); setError(null); },
    chooseCampaign(id) { return perform(async (services) => {
      const result = await services.awards.list(id);
      if (!accept(result)) return false;
      setSession((previous) => ({ ...previous, activeId: id, awards: result.value }));
      setGeneration(null); setAwardedIds([]); return true;
    }); },
    saveParty(changed) { return perform(async (services) => {
      const saved = await saveCampaign(services.campaigns, changed);
      if (!accept(saved)) return false;
      const campaignList = await services.campaigns.list(); if (!accept(campaignList)) return false;
      const awards = await services.awards.list(changed.id); if (!accept(awards)) return false;
      setSession({ campaigns: campaignList.value, activeId: changed.id, awards: awards.value });
      setGeneration(null); setAwardedIds([]); return true;
    }); },
    generate(config) {
      if (!campaign || busy) return false;
      const catalog = catalogs.find((entry) => entry.id === catalogId);
      if (!catalog) { setError({ kind: 'validation', message: 'Selecione um catálogo válido.' }); return false; }
      const result = generateForCampaign({ campaign, catalog: catalog.catalog, config, history: session.awards }, { random: Math.random, id: randomUUID, now: () => new Date().toISOString() });
      if (!accept(result)) return false;
      setGeneration(result.value); setAwardedIds([]); setError(null); return true;
    },
    awardItems(ids) { return perform(async (services) => {
      if (!generation || !campaign || campaign.id !== generation.campaignId) return false;
      const selected = generation.treasure.items.filter((item) => ids.includes(item.id) && !awardedIds.includes(item.id));
      if (!selected.length) { setError({ kind: 'validation', message: 'Estes itens já foram registrados ou não existem no resultado atual.' }); return false; }
      const awards = selected.map((item) => createAward(item, { id: item.id, campaignId: campaign.id, partyLevel: generation.treasure.config.level, now: new Date().toISOString() }));
      const result = await services.awards.add(awards); if (!accept(result)) return false;
      setAwardedIds((previous) => [...previous, ...selected.map((item) => item.id)]);
      return reloadAwards(services, campaign.id);
    }); },
    updateAward(award) { return perform(async (services) => { const result = await services.awards.update(award); return accept(result) && reloadAwards(services, award.campaignId); }); },
    removeAward(award) { return perform(async (services) => { const result = await services.awards.remove(award.id, award.campaignId); return accept(result) && reloadAwards(services, award.campaignId); }); },
    importText(text, name) { return perform(async (services) => {
      const parsed = importCatalogText(text); if (!accept(parsed)) return false;
      const result = await services.catalogs.save({ id: randomUUID(), name, catalog: parsed.value }); if (!accept(result)) return false;
      setCatalogs((previous) => [...previous, result.value]); setCatalogId(result.value.id); setGeneration(null); setAwardedIds([]); return true;
    }); },
  };
  return <AppContext.Provider value={controller}>{children}</AppContext.Provider>;
}
export function useApp() { const controller = useContext(AppContext); if (!controller) throw new Error('AppProvider não está disponível.'); return controller; }
