export type Character = Readonly<{ id: string; name: string }>;
export type Party = Readonly<{ level: number; characters: readonly Character[] }>;
export type Campaign = Readonly<{ id: string; name: string; party: Party; createdAt: string }>;
