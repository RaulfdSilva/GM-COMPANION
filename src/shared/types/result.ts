export type FailureKind = 'validation' | 'empty' | 'persistence' | 'unavailable';
export type AppError = Readonly<{
  kind: FailureKind;
  message: string;
  details?: readonly string[];
}>;
export type Result<T> = Readonly<{ ok: true; value: T }> | Readonly<{ ok: false; error: AppError }>;
export const success = <T>(value: T): Result<T> => ({ ok: true, value });
export const failure = (
  kind: FailureKind,
  message: string,
  details?: readonly string[],
): Result<never> => ({ ok: false, error: { kind, message, ...(details ? { details } : {}) } });
export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Falha sem detalhes técnicos disponíveis.';
}
