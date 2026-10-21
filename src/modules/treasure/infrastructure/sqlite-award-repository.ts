import { normalizeTimestamp } from '../../../shared/utils/timestamp.ts';
import type { AppDatabase, SqlConnection } from '../../../database/connection.ts';
import { errorMessage, failure, success } from '../../../shared/types/result.ts';
import type { AwardRepository } from '../application/award-service.ts';
import { validateAward } from '../application/award-service.ts';
import type { TreasureAward } from '../domain/models.ts';
type AwardRow = {
  id: string;
  campaign_id: string;
  item_id: string;
  item_name: string;
  rarity: TreasureAward['rarity'];
  variant_label: string | null;
  value_copper: number | null;
  party_level: number;
  awarded_at: string;
  notes: string;
};
const fromRow = (row: AwardRow): TreasureAward => ({
  id: row.id,
  campaignId: row.campaign_id,
  itemId: row.item_id,
  itemName: row.item_name,
  rarity: row.rarity,
  variantLabel: row.variant_label,
  valueCopper: row.value_copper,
  partyLevel: row.party_level,
  awardedAt: row.awarded_at,
  notes: row.notes,
});
async function insertAward(connection: SqlConnection, award: TreasureAward): Promise<void> {
  await connection.runAsync(
    'INSERT INTO treasure_awards (id,campaign_id,item_id,item_name,rarity,variant_label,value_copper,party_level,awarded_at,notes) VALUES (?,?,?,?,?,?,?,?,?,?)',
    award.id,
    award.campaignId,
    award.itemId,
    award.itemName.trim(),
    award.rarity,
    award.variantLabel,
    award.valueCopper,
    award.partyLevel,
    normalizeTimestamp(award.awardedAt) ?? award.awardedAt,
    award.notes,
  );
}
export function createAwardRepository(database: AppDatabase): AwardRepository {
  return {
    async list(campaignId) {
      try {
        const awards = (
          await database.getAllAsync<AwardRow>(
            'SELECT * FROM treasure_awards WHERE campaign_id = ? ORDER BY awarded_at DESC, rowid DESC',
            campaignId,
          )
        ).map(fromRow);
        for (const award of awards) {
          const invalid = validateAward(award);
          if (invalid) return invalid;
        }
        return success(
          awards.sort((left, right) => Date.parse(right.awardedAt) - Date.parse(left.awardedAt)),
        );
      } catch (error) {
        return failure('persistence', 'Não foi possível consultar o histórico.', [
          errorMessage(error),
        ]);
      }
    },
    async add(awards) {
      if (awards.length === 0) return failure('validation', 'Nenhum item para registrar.');
      for (const award of awards) {
        const validation = validateAward(award);
        if (validation) return validation;
      }
      try {
        await database.transaction(async (connection) => {
          for (const award of awards) await insertAward(connection, award);
        });
        return success(undefined);
      } catch (error) {
        return failure(
          'persistence',
          'Não foi possível concluir o registro. Consulte o histórico antes de tentar novamente.',
          [errorMessage(error)],
        );
      }
    },
    async update(award) {
      const validation = validateAward(award);
      if (validation) return validation;
      try {
        const result = await database.runAsync(
          'UPDATE treasure_awards SET item_id=?, item_name=?, rarity=?, variant_label=?, value_copper=?, party_level=?, awarded_at=?, notes=? WHERE id=? AND campaign_id=?',
          award.itemId,
          award.itemName.trim(),
          award.rarity,
          award.variantLabel,
          award.valueCopper,
          award.partyLevel,
          normalizeTimestamp(award.awardedAt) ?? award.awardedAt,
          award.notes,
          award.id,
          award.campaignId,
        );
        return result.changes ? success(undefined) : failure('empty', 'Registro não encontrado.');
      } catch (error) {
        return failure('persistence', 'Não foi possível corrigir o registro.', [
          errorMessage(error),
        ]);
      }
    },
    async remove(id, campaignId) {
      try {
        const result = await database.runAsync(
          'DELETE FROM treasure_awards WHERE id = ? AND campaign_id = ?',
          id,
          campaignId,
        );
        return result.changes ? success(undefined) : failure('empty', 'Registro não encontrado.');
      } catch (error) {
        return failure('persistence', 'Não foi possível excluir o registro.', [
          errorMessage(error),
        ]);
      }
    },
  };
}
