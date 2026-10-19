import type { ItemCategory, ItemRarity, TreasureTheme } from '../modules/treasure/domain/models.ts';
export const rarityLabels: Readonly<Record<ItemRarity, string>> = { common: 'Comum', uncommon: 'Incomum', rare: 'Raro', veryRare: 'Muito raro', legendary: 'Lendário', artifact: 'Artefato' };
export const categoryLabels: Readonly<Record<ItemCategory, string>> = { Armor: 'Armadura', Potion: 'Poção', Ring: 'Anel', Rod: 'Bastão', Scroll: 'Pergaminho', Staff: 'Cajado', Wand: 'Varinha', Weapon: 'Arma', 'Wondrous Item': 'Item maravilhoso' };
export const themeLabels: Readonly<Record<TreasureTheme, string>> = { Arcana: 'Arcana', Armaments: 'Armamentos', Implements: 'Instrumentos', Relics: 'Relíquias' };
