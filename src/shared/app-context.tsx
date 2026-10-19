import { createContext, useContext, useEffect, useState, useSyncExternalStore } from 'react';
import type { PropsWithChildren } from 'react';
import { randomUUID } from 'expo-crypto';
import { createAppController } from '../application/app-controller';
import type { AppState } from '../application/app-controller';
import { openAppServices } from '../bootstrap/open-app-services';
import type { Campaign } from '../modules/campaigns/domain/models';

type AppController = ReturnType<typeof createAppController>;
type ContextValue = AppState & AppController['actions'] & { campaign: Campaign | null };
const AppContext = createContext<ContextValue | null>(null);

export function AppProvider({ children }: PropsWithChildren) {
  const [controller] = useState(() => createAppController(openAppServices, {
    random: Math.random, id: randomUUID, now: () => new Date().toISOString(),
  }));
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);
  useEffect(() => {
    void controller.start();
    return () => { void controller.dispose(); };
  }, [controller]);
  const campaign = state.session.campaigns.find((entry) => entry.id === state.session.activeId) ?? null;
  return <AppContext.Provider value={{ ...state, ...controller.actions, campaign }}>{children}</AppContext.Provider>;
}

export function useApp() {
  const controller = useContext(AppContext);
  if (!controller) throw new Error('AppProvider não está disponível.');
  return controller;
}
