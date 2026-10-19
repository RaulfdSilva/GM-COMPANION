import type { PropsWithChildren } from 'react';
import { useApp } from '../app-context';
import { Button, Card, Copy, Notice, Page } from './ui';
const errorTitles = { validation: 'Revise os dados', empty: 'Nenhum resultado', persistence: 'Falha ao salvar ou consultar', unavailable: 'Recurso indisponível' };
export function AppPage({ title, children }: PropsWithChildren<{ title: string }>) {
  const app = useApp();
  return <Page title={title} loading={!app.ready && !app.error}>
    {app.error && <Card><Notice error>{errorTitles[app.error.kind]}: {app.error.message}</Notice>{app.error.details?.slice(0, 5).map((detail, index) => <Copy key={index} muted>{detail}</Copy>)}
      {app.ready ? <Button title="Fechar aviso" secondary onPress={app.clearError} /> : <Button title="Tentar iniciar novamente" onPress={app.retry} />}
    </Card>}
    {app.ready && children}
  </Page>;
}
