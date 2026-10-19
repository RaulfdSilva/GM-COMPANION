import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { useApp } from '../../../shared/app-context';
import { AppPage } from '../../../shared/components/app-page';
import { RequireCampaign } from '../../../shared/components/require-campaign';
import { Button, Card, Check, Choices, Copy, Field, Heading, styles } from '../../../shared/components/ui';
import { CATEGORIES, RARITIES, THEMES } from '../domain/models';
import { categoryLabels, rarityLabels, themeLabels } from '../../../shared/labels';
import { buildGenerationConfig } from './form-model';
import type { GeneratorForm } from './form-model';
import { CatalogPicker } from './catalog-picker';
export function GeneratorScreen() {
  const app = useApp(); const campaign = app.campaign;
  const [form, setForm] = useState<GeneratorForm>({ level: String(campaign?.party.level ?? 1), quantity: '1', rarityMode: 'automatic', manualRarity: 'common', theme: 'Arcana', mode: 'custom', categories: CATEGORIES, maxGold: '', unknownValuePolicy: 'exclude' });
  useEffect(() => { if (campaign) setForm((previous) => ({ ...previous, level: String(campaign.party.level) })); }, [campaign]);
  function change<K extends keyof GeneratorForm>(key: K, value: GeneratorForm[K]) { setForm((previous) => ({ ...previous, [key]: value })); }
  function generate() {
    const result = buildGenerationConfig(form);
    if (!result.ok) { app.reportError(result.error); return; }
    if (app.generate(result.value)) router.push('/result');
  }
  return <AppPage title="Gerador de tesouros">{!campaign ? <RequireCampaign /> : <>
    <Copy muted>{campaign.name} • Prepare resultados sem registrar concessões automaticamente.</Copy>
    <CatalogPicker />
    <Card><Heading>Parâmetros do sorteio</Heading>
      <Field label="Nível do grupo neste sorteio (1–20)" keyboardType="number-pad" value={form.level} onChangeText={(value) => change('level', value)} />
      <Choices label="Raridade" value={form.rarityMode} options={[{ value: 'automatic', label: 'Automática por nível' }, { value: 'manual', label: 'Escolha manual' }]} onChange={(value) => change('rarityMode', value)} />
      {form.rarityMode === 'manual' && <Choices label="Raridade escolhida" options={RARITIES.map((rarity) => ({ value: rarity, label: rarityLabels[rarity] }))} value={form.manualRarity} onChange={(value) => change('manualRarity', value)} />}
      <Choices label="Tema" options={THEMES.map((theme) => ({ value: theme, label: themeLabels[theme] }))} value={form.theme} onChange={(value) => change('theme', value)} />
      <Choices label="Procedimento" options={[{ value: 'faithful', label: 'Fiel ao catálogo' }, { value: 'custom', label: 'Personalizado' }]} value={form.mode} onChange={(value) => change('mode', value)} />
      <Copy muted>{form.mode === 'faithful' ? 'Rola 1d100 na tabela selecionada, seguido das resoluções adicionais. Usa todas as categorias, sem limite de valor.' : 'Aplica filtros preservando os pesos dos intervalos e das variantes. A raridade automática nunca é ressorteada para contornar filtros vazios.'}</Copy>
      {form.mode === 'custom' && <>
        <Heading>Categorias</Heading><Button title="Selecionar todas" secondary onPress={() => change('categories', CATEGORIES)} />
        <View style={styles.row}>{CATEGORIES.map((category) => <Check key={category} title={categoryLabels[category]} checked={form.categories.includes(category)} onPress={() => change('categories', form.categories.includes(category) ? form.categories.filter((value) => value !== category) : [...form.categories, category])} />)}</View>
        <Field label="Valor máximo por item (PO, opcional)" keyboardType="decimal-pad" placeholder="Ex.: 400 ou 400,50" value={form.maxGold} onChangeText={(value) => change('maxGold', value)} />
        <Copy muted>O limite vale para cada resultado, incluindo equipamento e modificadores. Não é um orçamento total do lote.</Copy>
        <Check title="Permitir itens com valor desconhecido, mediante alerta" checked={form.unknownValuePolicy === 'allowWithWarning'} onPress={() => change('unknownValuePolicy', form.unknownValuePolicy === 'exclude' ? 'allowWithWarning' : 'exclude')} />
      </>}
      <Field label="Quantidade de resultados (1–100)" keyboardType="number-pad" value={form.quantity} onChangeText={(value) => change('quantity', value)} />
      <Button title="Sortear tesouros" disabled={app.busy} onPress={generate} />
    </Card>
  </>}</AppPage>;
}
