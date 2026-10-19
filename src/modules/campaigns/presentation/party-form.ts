import type { Campaign, Character } from '../domain/models.ts';
import { validateCampaign } from '../application/campaign-service.ts';
import { failure, success } from '../../../shared/types/result.ts';
import type { Result } from '../../../shared/types/result.ts';

export function buildPartyUpdate(
  campaign: Campaign,
  form: Readonly<{ name: string; level: string; names: string }>,
  id: () => string,
): Result<Campaign> {
  if (!/^\d+$/.test(form.level.trim())) {
    return failure('validation', 'O nível deve ser um número inteiro entre 1 e 20.');
  }
  const names = form.names.split('\n').map((name) => name.trim()).filter(Boolean);
  const available = [...campaign.party.characters];
  const matched = names.map((name) => {
    const index = available.findIndex((character) => character.name === name);
    return index < 0 ? null : available.splice(index, 1)[0] ?? null;
  });
  const characters: Character[] = names.map((name, index) => {
    const samePosition = campaign.party.characters[index];
    const reusable = samePosition && available.some((character) => character.id === samePosition.id)
      ? samePosition : null;
    const character = matched[index] ?? reusable;
    if (character) {
      const remainingIndex = available.findIndex((entry) => entry.id === character.id);
      if (remainingIndex >= 0) available.splice(remainingIndex, 1);
    }
    return { id: character?.id ?? id(), name };
  });
  const updated: Campaign = { ...campaign, name: form.name.trim(),
    party: { level: Number(form.level), characters } };
  return validateCampaign(updated) ?? success(updated);
}
