import { useState } from 'react';
import { router } from 'expo-router';
import { randomUUID } from 'expo-crypto';
import { useApp } from '../../../shared/app-context';
import { AppPage } from '../../../shared/components/app-page';
import { Button, Card, Copy, Field, Heading } from '../../../shared/components/ui';
export function CampaignsScreen() {
  const app = useApp(); const [name, setName] = useState('');
  async function create() {
    const saved = await app.saveParty({ id: randomUUID(), name, createdAt: new Date().toISOString(), party: { level: 1, characters: [] } });
    if (saved) { setName(''); router.push('/party'); }
  }
  return <AppPage title="Campanhas">
    <Card><Heading>Uma nova jornada</Heading><Field label="Nome da campanha" value={name} onChangeText={setName} maxLength={120} placeholder="As ruínas da alvorada" /><Button title="Criar e configurar grupo" disabled={app.busy} onPress={() => void create()} /></Card>
    <Heading>Suas campanhas</Heading>
    {!app.session.campaigns.length && <Copy muted>Nenhuma campanha criada.</Copy>}
    {app.session.campaigns.map((campaign) => <Card key={campaign.id}><Heading>{campaign.name}</Heading><Copy>Nível {campaign.party.level} • {campaign.party.characters.length} personagem(ns){app.campaign?.id === campaign.id ? ' • selecionada' : ''}</Copy><Button title="Selecionar campanha" disabled={app.busy} onPress={() => { void app.chooseCampaign(campaign.id).then((selected) => { if (selected) router.dismissTo('/'); }); }} /></Card>)}
  </AppPage>;
}
