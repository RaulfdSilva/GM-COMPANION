import { router } from 'expo-router';
import { useApp } from '../../../shared/app-context';
import { AppPage } from '../../../shared/components/app-page';
import { Button, Card, Copy, Heading, Notice } from '../../../shared/components/ui';
import { categoryLabels, rarityLabels } from '../../../shared/labels';
import { formatCopper } from '../domain/economy';
const assessmentLabels = { withinReference: 'Dentro da referência quantitativa', aboveReference: 'Acima da referência quantitativa', unusual: 'Incomum nesta faixa de níveis', insufficientData: 'Dados insuficientes' };
export function ResultScreen() {
  const app = useApp(); const generation = app.generation;
  const pending = generation?.treasure.items.filter((item) => !app.awardedIds.includes(item.id)) ?? [];
  return <AppPage title="Tesouros encontrados">{!generation ? <Card><Copy>Nenhum sorteio ativo. Os itens já concedidos continuam no histórico.</Copy><Button title="Ir para o gerador" onPress={() => router.push('/generator')} /></Card> : <>
    <Copy muted>{generation.treasure.items.length} resultado(s) • nível {generation.treasure.config.level} • {generation.treasure.config.mode === 'faithful' ? 'Rolagem fiel ao catálogo' : 'Seleção ponderada personalizada'}</Copy>
    <Notice>A avaliação considera o lote inteiro e o histórico disponível no momento do sorteio. Registrar uma concessão é uma decisão do Mestre.</Notice>
    <Button title={pending.length ? `Registrar ${pending.length} item(ns) restante(s)` : 'Todos os itens registrados'} disabled={app.busy || !pending.length} onPress={() => void app.awardItems(pending.map((item) => item.id))} />
    {generation.treasure.items.map((result) => {
      const assessment = generation.assessments[result.id]; const awarded = app.awardedIds.includes(result.id);
      return <Card key={result.id}><Heading>{result.item.name}</Heading>
        <Copy>{rarityLabels[result.rarity]} • {categoryLabels[result.item.category]} • {result.value.kind === 'known' ? formatCopper(result.value.copper) : 'Valor desconhecido'}</Copy>
        {result.variant && <Copy>Variante: {result.variant.label}</Copy>}
        <Copy muted>{result.item.consumable ? 'Consumível' : 'Permanente'} • {result.item.attunement ? 'Exige sintonização' : 'Sem sintonização'}</Copy>
        {(result.variant?.baseEquipment ?? result.item.baseEquipment) && <Copy muted>Equipamento-base: {(result.variant?.baseEquipment ?? result.item.baseEquipment)?.name}</Copy>}
        <Copy>{result.item.description || 'Sem descrição autorizada neste catálogo.'}</Copy>
        <Copy muted>Tabela: {result.tableId}{result.rolls.length ? ` • Dados: ${result.rolls.join(' → ')}` : ' • Pesos condicionados aos filtros'}</Copy>
        {result.warnings.map((warning) => <Notice key={warning}>{warning}</Notice>)}
        {assessment && <>
          <Heading>{assessmentLabels[assessment.classification]}</Heading><Copy>{assessment.explanation}</Copy>
          {assessment.warnings.map((warning) => <Copy key={warning} muted>{warning}</Copy>)}
          {assessment.rulesUsed.map((rule) => <Copy key={rule} muted>• {rule}</Copy>)}
          {assessment.insufficientData.map((missing) => <Notice key={missing}>{missing}</Notice>)}
          <Copy muted>Grupo: {assessment.partySize ?? 'quantidade desconhecida'} personagem(ns).</Copy>
        </>}
        <Copy muted>Fonte do item: {result.item.source.name} • {result.item.source.license} • {result.item.source.kind === 'original' ? 'original' : result.item.source.kind === 'srd' ? 'SRD declarado pelo catálogo' : 'privado'}</Copy>
        {!!result.item.source.attribution && <Copy muted>{result.item.source.attribution}</Copy>}
        <Button title={awarded ? 'Concessão registrada' : 'Registrar este item'} disabled={app.busy || awarded} onPress={() => void app.awardItems([result.id])} />
      </Card>;
    })}
    <Button title="Consultar histórico" secondary onPress={() => router.push('/history')} />
    <Button title="Novo sorteio" secondary onPress={() => router.push('/generator')} />
  </>}</AppPage>;
}
