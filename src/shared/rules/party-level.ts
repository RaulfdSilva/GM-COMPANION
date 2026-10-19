export const MIN_PARTY_LEVEL = 1;
export const MAX_PARTY_LEVEL = 20;

export function isPartyLevel(level: number): boolean {
  return Number.isInteger(level) && level >= MIN_PARTY_LEVEL && level <= MAX_PARTY_LEVEL;
}
