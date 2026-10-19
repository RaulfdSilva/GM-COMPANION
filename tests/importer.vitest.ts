import { describe, expect, test } from 'vitest';
import { importCatalog, importCatalogText } from '../src/modules/treasure/infrastructure/catalog-importer.ts';
import { createCatalogRepository } from '../src/modules/treasure/infrastructure/sqlite-catalog-repository.ts';
import { migrateDatabase } from '../src/database/migrations.ts';
import { catalog } from './fixtures.ts';
import { openNodeDatabase } from './node-database.ts';
describe('importação Zod e persistência', () => {
  test('aceita demonstração e JSON serializado', () => { expect(importCatalog(catalog).ok).toBe(true); expect(importCatalogText(JSON.stringify(catalog)).ok).toBe(true); });
  test.each([null, {}, { ...catalog, schemaVersion: 2 }, { ...catalog, items: [{ id: 'x' }] }])('rejeita dados externos inválidos', (input) => { expect(importCatalog(input).ok).toBe(false); });
  test('rejeita JSON inválido, campos extras e arquivo excessivo', () => {
    expect(importCatalogText('{').ok).toBe(false); expect(importCatalog({ ...catalog, unexpected: true }).ok).toBe(false); expect(importCatalogText(' '.repeat(2_000_001)).ok).toBe(false);
  });
  test('rejeita custo monetário fracionário e referências inválidas', () => {
    expect(importCatalog({ ...catalog, items: catalog.items.map((item) => ({ ...item, additionalCostCopper: 0.5 })) }).ok).toBe(false);
    expect(importCatalog({ ...catalog, items: catalog.items.slice(1) }).ok).toBe(false);
  });
  test('importação é persistente e catálogo inválido não é inserido', async () => {
    const database = openNodeDatabase();
    try { await migrateDatabase(database); const repository = createCatalogRepository(database); const record = { id: 'private-1', name: 'Mesa privada', catalog };
      expect((await repository.save(record)).ok).toBe(true); expect(await repository.list()).toEqual({ ok: true, value: [record] });
      expect((await repository.save({ ...record, id: 'bad', catalog: { ...catalog, items: [] } })).ok).toBe(false);
      const rows = await database.getAllAsync('SELECT id FROM imported_catalogs'); expect(rows).toHaveLength(1);
    } finally { database.close(); }
  });
});
