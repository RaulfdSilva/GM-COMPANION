import { router } from 'expo-router';
import { useApp } from '../app-context';
import { AppPage } from './app-page';
import { Button, Card, Copy, Heading, Notice } from './ui';
export function HomeScreen() {
  const app = useApp();
  return <AppPage title="A próxima descoberta">
    <Copy muted>Prepare tesouros, avalie a progressão e mantenha a memória da campanha. Tudo no seu dispositivo.</Copy>
    <Card><Heading>{app.campaign?.name ?? 'Seu caderno está pronto'}</Heading><Copy>{app.campaign ? `Nível ${app.campaign.party.level} • ${app.campaign.party.characters.length} personagem(ns) • ${app.session.historyAvailable ? `${app.session.awards.length} recompensa(s)` : 'Histórico indisponível'}` : 'Comece criando uma campanha e configurando o grupo.'}</Copy>
      <Button title={app.campaign ? 'Gerar tesouros' : 'Criar campanha'} onPress={() => router.push(app.campaign ? '/generator' : '/campaigns')} />
    </Card>
    <Button title="Campanhas" secondary onPress={() => router.push('/campaigns')} />
    {app.campaign && <><Button title="Configuração do grupo" secondary onPress={() => router.push('/party')} /><Button title="Histórico de recompensas" secondary onPress={() => router.push('/history')} /></>}
    <Notice>Catálogo inicial demonstrativo e original. Não contém as tabelas oficiais de D&D. Referências de progressão são orientações, não limites rígidos.</Notice>
  </AppPage>;
}
