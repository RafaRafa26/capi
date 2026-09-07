/**
 * Errors the edge layer knows how to translate for the user. Any other
 * exception is our bug and its message must not be shown — it could leak
 * database or infrastructure detail.
 */
export class BusinessError extends Error {
  constructor(
    message: string,
    readonly field?: string,
  ) {
    super(message);
    this.name = "BusinessError";
  }
}

export class Unauthenticated extends Error {
  constructor(message = "Session expired. Sign in again.") {
    super(message);
    this.name = "Unauthenticated";
  }
}

export class NotFound extends BusinessError {
  constructor(what = "Record") {
    super(`${what} not found.`);
    this.name = "NotFound";
  }
}

/** Standard shape for server actions consumed by a form. */
export type Result<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string; field?: string };

export function failure(error: unknown): { ok: false; error: string; field?: string } {
  if (error instanceof BusinessError) {
    return { ok: false, error: error.message, field: error.field };
  }
  if (error instanceof Unauthenticated) {
    return { ok: false, error: error.message };
  }
  console.error("Unexpected error:", error);
  return {
    ok: false,
    error: "Could not complete the operation. Please try again.",
  };
}
