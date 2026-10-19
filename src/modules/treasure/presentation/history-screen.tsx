import { useState } from 'react';
import { useApp } from '../../../shared/app-context';
import { AppPage } from '../../../shared/components/app-page';
import { RequireCampaign } from '../../../shared/components/require-campaign';
import { Button, Card, Copy, Heading, Notice } from '../../../shared/components/ui';
import { rarityLabels } from '../../../shared/labels';
import { RARITIES } from '../domain/models';
import type { TreasureAward } from '../domain/models';
import { rarityTotals } from '../application/award-service';
import { formatCopper } from '../domain/economy';
import { AwardEditor } from './award-editor';
export function HistoryScreen() {
  const app = useApp(); const [editing, setEditing] = useState<TreasureAward | null>(null); const [deleting, setDeleting] = useState<string | null>(null);
  const totals = rarityTotals(app.session.awards);
  return <AppPage title="Histórico de recompensas">{!app.campaign ? <RequireCampaign /> : <>
    <Copy muted>{app.campaign.name} • Concessões registradas neste dispositivo.</Copy>
    <Card><Heading>Totais por raridade</Heading>{[...RARITIES, 'artifact' as const].map((rarity) => <Copy key={rarity}>{rarityLabels[rarity]}: {totals[rarity] ?? 0}</Copy>)}</Card>
    {editing && <AwardEditor key={editing.id} award={editing} onClose={() => setEditing(null)} />}
    {!app.session.awards.length && <Copy>Nenhuma recompensa concedida. Sorteie e registre um item para começar o histórico.</Copy>}
    {app.session.awards.map((award) => <Card key={award.id}>
      <Heading>{award.itemName}</Heading><Copy>{rarityLabels[award.rarity]} • Nível {award.partyLevel} • {award.valueCopper === null ? 'Valor desconhecido' : formatCopper(award.valueCopper)}</Copy>
      {award.variantLabel && <Copy>Variante: {award.variantLabel}</Copy>}
      <Copy muted>{new Date(award.awardedAt).toLocaleString('pt-BR')}</Copy>
      {!!award.notes && <Copy>{award.notes}</Copy>}
      <Button title="Corrigir registro" secondary disabled={app.busy} onPress={() => { setEditing(award); setDeleting(null); }} />
      {deleting === award.id ? <>
        <Notice>Excluir esta concessão do histórico? A contagem de recompensas será atualizada.</Notice>
        <Button title="Confirmar exclusão" disabled={app.busy} onPress={() => { void app.removeAward(award).then((removed) => { if (removed) { setDeleting(null); if (editing?.id === award.id) setEditing(null); } }); }} />
        <Button title="Manter registro" secondary disabled={app.busy} onPress={() => setDeleting(null)} />
      </> : <Button title="Excluir registro" secondary disabled={app.busy} onPress={() => setDeleting(award.id)} />}
    </Card>)}
  </>}</AppPage>;
}
