export const RARITIES = ['common', 'uncommon', 'rare', 'veryRare', 'legendary'] as const;
export type Rarity = (typeof RARITIES)[number];
export type ItemRarity = Rarity | 'artifact';
export const THEMES = ['Arcana', 'Armaments', 'Implements', 'Relics'] as const;
export type TreasureTheme = (typeof THEMES)[number];
export const CATEGORIES = ['Armor', 'Potion', 'Ring', 'Rod', 'Scroll', 'Staff', 'Wand', 'Weapon', 'Wondrous Item'] as const;
export type ItemCategory = (typeof CATEGORIES)[number];
export type ContentSource = Readonly<{
  name: string; license: string; kind: 'original' | 'srd' | 'private'; attribution: string;
}>;
export type ItemPricing =
  | Readonly<{ kind: 'reference' }>
  | Readonly<{ kind: 'scroll'; inscriptionCopper: number | null }>
  | Readonly<{ kind: 'unknown'; reason: string }>;
export type MagicItem = Readonly<{
  id: string; name: string; rarity: ItemRarity; category: ItemCategory;
  themes: readonly TreasureTheme[]; consumable: boolean; attunement: boolean;
  pricing: ItemPricing; baseEquipment: Readonly<{ name: string; costCopper: number | null }> | null;
  additionalCostCopper: number; source: ContentSource; description: string;
  variantMetadata: Readonly<Record<string, string>>;
}>;
export type VariantParameters = Readonly<{
  label: string; baseEquipment: Readonly<{ name: string; costCopper: number | null }> | null;
  additionalCostCopper: number;
}>;
export type ItemTarget = Readonly<{ kind: 'item'; itemId: string; variant: VariantParameters | null }>;
export type ResolutionTarget = ItemTarget | Readonly<{ kind: 'resolution'; resolutionId: string }>;
export type TreasureTableEntry = Readonly<{
  tableId: string; min: number; max: number; target: ResolutionTarget;
}>;
export type TreasureTable = Readonly<{
  id: string; name: string; rarity: Rarity; theme: TreasureTheme; complete: boolean;
  source: ContentSource; entries: readonly TreasureTableEntry[];
}>;
export type VariantResolution = Readonly<{
  id: string; name: string; sides: number; complete: boolean;
  entries: readonly Readonly<{ min: number; max: number; target: ItemTarget }>[];
}>;
export type TreasureCatalog = Readonly<{
  schemaVersion: 1; items: readonly MagicItem[]; tables: readonly TreasureTable[];
  resolutions: readonly VariantResolution[];
}>;
export type TreasureGenerationConfig = Readonly<{
  level: number; rarity: Readonly<{ mode: 'automatic' }> | Readonly<{ mode: 'manual'; value: Rarity }>;
  theme: TreasureTheme; mode: 'faithful' | 'custom'; categories: readonly ItemCategory[];
  maxValueCopper: number | null; unknownValuePolicy: 'exclude' | 'allowWithWarning'; quantity: number;
}>;
export type MoneyValue = Readonly<{ kind: 'known'; copper: number }> | Readonly<{ kind: 'unknown'; reason: string }>;
export type GeneratedItem = Readonly<{
  id: string; item: MagicItem; variant: VariantParameters | null; value: MoneyValue;
  tableId: string; rarity: Rarity; rolls: readonly number[]; warnings: readonly string[];
}>;
export type GeneratedTreasure = Readonly<{
  id: string; config: TreasureGenerationConfig; items: readonly GeneratedItem[]; createdAt: string;
}>;
export type TreasureAward = Readonly<{
  id: string; campaignId: string; itemId: string; itemName: string; rarity: ItemRarity;
  variantLabel: string | null; valueCopper: number | null; partyLevel: number;
  awardedAt: string; notes: string;
}>;
export type BalanceAssessment = Readonly<{
  classification: 'withinReference' | 'aboveReference' | 'unusual' | 'insufficientData';
  explanation: string; rulesUsed: readonly string[]; warnings: readonly string[];
  insufficientData: readonly string[]; accumulated: number | null; reference: number | null;
  partySize: number | null;
}>;
