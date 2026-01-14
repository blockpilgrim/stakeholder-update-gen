export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor({
    status,
    code,
    message,
    cause
  }: {
    status: number;
    code: string;
    message: string;
    cause?: unknown;
  }) {
    super(message, cause ? { cause } : undefined);
    this.status = status;
    this.code = code;
  }
}

export function isApiError(err: unknown): err is ApiError {
  return err instanceof ApiError;
}
