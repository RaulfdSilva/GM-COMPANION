import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { randomUUID } from 'expo-crypto';
import { buildPartyUpdate } from './party-form';
import { useApp } from '../../../shared/app-context';
import { AppPage } from '../../../shared/components/app-page';
import { RequireCampaign } from '../../../shared/components/require-campaign';
import { Button, Card, Copy, Field } from '../../../shared/components/ui';
export function PartyScreen() {
  const app = useApp(); const campaign = app.campaign;
  const [name, setName] = useState(''); const [level, setLevel] = useState('1'); const [names, setNames] = useState('');
  useEffect(() => { if (campaign) { setName(campaign.name); setLevel(String(campaign.party.level)); setNames(campaign.party.characters.map((character) => character.name).join('\n')); } }, [campaign]);
  async function save() {
    if (!campaign) return;
    const updated = buildPartyUpdate(campaign, { name, level, names }, randomUUID);
    if (!updated.ok) { app.reportError(updated.error); return; }
    if (await app.saveParty(updated.value)) router.dismissTo('/');
  }
  return <AppPage title="Configuração do grupo">{!campaign ? <RequireCampaign /> : <Card>
    <Field label="Nome da campanha" value={name} onChangeText={setName} maxLength={120} />
    <Field label="Nível do grupo (1–20)" value={level} onChangeText={setLevel} keyboardType="number-pad" />
    <Field label="Personagens (um nome por linha)" value={names} onChangeText={setNames} multiline placeholder="Ari\nLuna" />
    <Copy muted>O número de personagens é apenas contextual. Não altera os valores de referência de recompensas.</Copy>
    <Button title="Salvar grupo" disabled={app.busy} onPress={() => void save()} />
  </Card>}</AppPage>;
}
