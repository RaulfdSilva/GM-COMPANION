import assert from 'node:assert/strict';
import { buildPartyUpdate } from '../src/modules/campaigns/presentation/party-form.ts';
import { formatCopper, formatGoldInput, parseGoldInput } from '../src/modules/treasure/presentation/money.ts';
import { normalizeTimestamp } from '../src/shared/utils/timestamp.ts';
import { utf8ByteLength } from '../src/shared/utils/utf8.ts';
import type { TestCase } from './domain-cases.ts';
import { campaign } from './fixtures.ts';

const party = { ...campaign, party: { ...campaign.party, characters: [{ id: 'ari', name: 'Ari' }, { id: 'luna', name: 'Luna' }] } };
export const auditMobileCases: readonly TestCase[] = [
  {
    name: 'formulário: remover ou reordenar personagens preserva seus IDs',
    run() {
      for (const [names, expected] of [['Luna', ['luna']], ['Luna\nAri', ['luna', 'ari']]] as const) {
        const result = buildPartyUpdate(party, { name: party.name, level: '2', names }, () => 'new');
        assert.ok(result.ok); assert.deepEqual(result.value.party.characters.map((entry) => entry.id), expected);
      }
    },
  },
  {
    name: 'formulário: renomear personagem na mesma posição mantém ID disponível',
    run() {
      const result = buildPartyUpdate(party, { name: party.name, level: '2', names: 'Novo nome\nLuna' }, () => 'new');
      assert.ok(result.ok); assert.deepEqual(result.value.party.characters.map((entry) => entry.id), ['ari', 'luna']);
    },
  },
  {
    name: 'formulário: nível decimal, nome vazio e IDs novos duplicados são recusados',
    run() {
      for (const form of [{ name: party.name, level: '1.5', names: '' }, { name: ' ', level: '1', names: '' }, { name: party.name, level: '1', names: 'A\nB' }]) {
        assert.equal(buildPartyUpdate({ ...party, party: { level: 1, characters: [] } }, form, () => 'duplicate').ok, false);
      }
    },
  },
  {
    name: 'formulário: edição de moeda faz roundtrip exato até o limite seguro',
    run() {
      for (const copper of [0, 1, 10, 29, 99, 100, 101, 20000000, Number.MAX_SAFE_INTEGER - 1, Number.MAX_SAFE_INTEGER]) {
        assert.deepEqual(parseGoldInput(formatGoldInput(copper)), { ok: true, value: copper });
      }
      assert.equal(formatCopper(101), '1,01 PO');
      assert.equal(formatCopper(NaN), 'Valor inválido');
    },
  },
  {
    name: 'validação: timestamp aceita fuso explícito e dia bissexto real',
    run() {
      assert.equal(normalizeTimestamp('2024-02-29T12:34:56+03:00'), '2024-02-29T09:34:56.000Z');
      for (const date of ['2025-02-29T00:00:00Z', '2026-13-01T00:00:00Z', '2026-10-19T24:00:00Z', '2026-10-19T12:34:56']) assert.equal(normalizeTimestamp(date), null);
    },
  },
  {
    name: 'importação: limite UTF-8 contabiliza acentos, emoji e surrogates',
    run() {
      for (const text of ['', 'abc', 'ação', '🧙', '\ud800', 'é'.repeat(1000)]) assert.equal(utf8ByteLength(text), Buffer.byteLength(text, 'utf8'));
    },
  },
];
