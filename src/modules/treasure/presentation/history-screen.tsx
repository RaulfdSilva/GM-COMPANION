import { useState } from 'react';
import { useApp } from '../../../shared/app-context';
import { AppPage } from '../../../shared/components/app-page';
import { RequireCampaign } from '../../../shared/components/require-campaign';
import { Button, Card, Copy, Heading, Notice } from '../../../shared/components/ui';
import { rarityLabels } from '../../../shared/labels';
import { RARITIES } from '../domain/models';
import { rarityTotals } from '../application/award-service';
import { formatCopper } from './money';
import { AwardEditor } from './award-editor';

function CampaignHistory() {
  const app = useApp();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const totals = rarityTotals(app.session.awards);
  return <>
    <Copy muted>{app.campaign?.name} • Concessões registradas neste dispositivo.</Copy>
    {!app.session.historyAvailable && <Notice>O histórico não está atualizado. Os registros abaixo são a última informação disponível; selecione a campanha novamente para recarregar.</Notice>}
    {app.session.historyAvailable && <Card>
      <Heading>Totais por raridade</Heading>
      {[...RARITIES, 'artifact' as const].map((rarity) => <Copy key={rarity}>{rarityLabels[rarity]}: {totals[rarity] ?? 0}</Copy>)}
    </Card>}
    {app.session.historyAvailable && !app.session.awards.length && <Copy>Nenhuma recompensa concedida. Sorteie e registre um item para começar o histórico.</Copy>}
    {app.session.awards.map((award) => editingId === award.id
      ? <AwardEditor key={award.id} award={award} onClose={() => setEditingId(null)} />
      : <Card key={award.id}>
          <Heading>{award.itemName}</Heading>
          <Copy>{rarityLabels[award.rarity]} • Nível {award.partyLevel} • {award.valueCopper === null ? 'Valor desconhecido' : formatCopper(award.valueCopper)}</Copy>
          {award.variantLabel && <Copy>Variante: {award.variantLabel}</Copy>}
          <Copy muted>{new Date(award.awardedAt).toLocaleString('pt-BR')}</Copy>
          {!!award.notes && <Copy>{award.notes}</Copy>}
          <Button title="Corrigir registro" secondary disabled={app.busy} onPress={() => { setEditingId(award.id); setDeletingId(null); }} />
          {deletingId === award.id ? <>
            <Notice>Excluir esta concessão do histórico? A contagem de recompensas será atualizada.</Notice>
            <Button title="Confirmar exclusão" disabled={app.busy} onPress={() => {
              void app.removeAward(award).then((removed) => { if (removed) setDeletingId(null); });
            }} />
            <Button title="Manter registro" secondary disabled={app.busy} onPress={() => setDeletingId(null)} />
          </> : <Button title="Excluir registro" secondary disabled={app.busy} onPress={() => setDeletingId(award.id)} />}
        </Card>)}
  </>;
}

export function HistoryScreen() {
  const app = useApp();
  return <AppPage title="Histórico de recompensas">
    {app.campaign ? <CampaignHistory key={app.campaign.id} /> : <RequireCampaign />}
  </AppPage>;
}
