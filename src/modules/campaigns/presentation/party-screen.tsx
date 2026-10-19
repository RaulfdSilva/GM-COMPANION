import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { randomUUID } from 'expo-crypto';
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
    if (!/^\d+$/.test(level.trim())) { app.reportError({ kind: 'validation', message: 'O nível deve ser um número inteiro entre 1 e 20.' }); return; }
    const characters = names.split('\n').map((value) => value.trim()).filter(Boolean).map((value, index) => ({ id: campaign.party.characters[index]?.id ?? randomUUID(), name: value }));
    if (await app.saveParty({ ...campaign, name, party: { level: Number(level), characters } })) router.push('/');
  }
  return <AppPage title="Configuração do grupo">{!campaign ? <RequireCampaign /> : <Card>
    <Field label="Nome da campanha" value={name} onChangeText={setName} maxLength={120} />
    <Field label="Nível do grupo (1–20)" value={level} onChangeText={setLevel} keyboardType="number-pad" />
    <Field label="Personagens (um nome por linha)" value={names} onChangeText={setNames} multiline placeholder="Ari\nLuna" />
    <Copy muted>O número de personagens é apenas contextual. Não altera os valores de referência de recompensas.</Copy>
    <Button title="Salvar grupo" disabled={app.busy} onPress={() => void save()} />
  </Card>}</AppPage>;
}
