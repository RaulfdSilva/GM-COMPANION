import { useState } from 'react';
import { useApp } from '../../../shared/app-context';
import { Button, Card, Choices, Field, Heading, Notice } from '../../../shared/components/ui';
import { RARITIES } from '../domain/models';
import type { ItemRarity, TreasureAward } from '../domain/models';
import { parseGoldInput } from '../domain/economy';
import { rarityLabels } from '../../../shared/labels';
export function AwardEditor({ award, onClose }: { award: TreasureAward; onClose: () => void }) {
  const app = useApp(); const [name, setName] = useState(award.itemName);
  const [rarity, setRarity] = useState<ItemRarity>(award.rarity);
  const [level, setLevel] = useState(String(award.partyLevel)); const [notes, setNotes] = useState(award.notes);
  const [date, setDate] = useState(award.awardedAt); const [variant, setVariant] = useState(award.variantLabel ?? '');
  const [value, setValue] = useState(award.valueCopper === null ? '' : `${Math.floor(award.valueCopper / 100)}.${String(award.valueCopper % 100).padStart(2, '0')}`);
  async function save() {
    const parsed = parseGoldInput(value);
    if (!parsed.ok) { app.reportError(parsed.error); return; }
    if (!/^\d+$/.test(level.trim())) { app.reportError({ kind: 'validation', message: 'Informe um nível inteiro entre 1 e 20.' }); return; }
    if (await app.updateAward({ ...award, itemName: name, rarity, partyLevel: Number(level), notes, awardedAt: date, variantLabel: variant.trim() || null, valueCopper: parsed.value })) onClose();
  }
  return <Card><Heading>Corrigir registro</Heading>
    <Field label="Nome do item concedido" value={name} onChangeText={setName} maxLength={200} />
    <Choices label="Raridade registrada" options={[...RARITIES, 'artifact' as const].map((option) => ({ value: option, label: rarityLabels[option] }))} value={rarity} onChange={setRarity} />
    <Field label="Variante (opcional)" value={variant} onChangeText={setVariant} maxLength={200} />
    <Field label="Nível no momento da concessão" value={level} onChangeText={setLevel} keyboardType="number-pad" />
    <Field label="Valor em PO (vazio = desconhecido)" value={value} onChangeText={setValue} keyboardType="decimal-pad" />
    <Field label="Data de concessão (ISO 8601)" value={date} onChangeText={setDate} autoCapitalize="none" />
    <Field label="Observações" value={notes} onChangeText={setNotes} multiline maxLength={2000} />
    <Notice>Esta correção altera o histórico e as avaliações futuras. O catálogo original permanece separado.</Notice>
    <Button title="Salvar correção" onPress={() => void save()} disabled={app.busy} />
    <Button title="Cancelar edição" onPress={onClose} secondary disabled={app.busy} />
  </Card>;
}
