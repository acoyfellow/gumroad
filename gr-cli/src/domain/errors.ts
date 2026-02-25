import { Effect } from "effect";

/**
 * Configuration error - token not found, invalid config, etc.
 */
export class ConfigError {
  readonly _tag = "ConfigError";
  constructor(readonly message: string) {}
}

/**
 * API error - HTTP errors, authentication failures, etc.
 */
export class ApiError {
  readonly _tag = "ApiError";
  constructor(
    readonly message: string,
    readonly statusCode?: number,
  ) {}
}

/**
 * Network error - connection issues, timeouts, etc.
 */
export class NetworkError {
  readonly _tag = "NetworkError";
  constructor(readonly message: string) {}
}

/**
 * Validation error - invalid input, missing required fields, etc.
 */
export class ValidationError {
  readonly _tag = "ValidationError";
  constructor(readonly message: string) {}
}

/**
 * Union of all CLI errors
 */
export type CliError = ConfigError | ApiError | NetworkError | ValidationError;

/**
 * Helper to convert unknown errors to CliError
 */
export const toCliError = (error: unknown): CliError => {
  if (error instanceof ConfigError) return error;
  if (error instanceof ApiError) return error;
  if (error instanceof NetworkError) return error;
  if (error instanceof ValidationError) return error;

  if (error instanceof Error) {
    if (error.message.includes("fetch") || error.message.includes("network")) {
      return new NetworkError(error.message);
    }
    return new ApiError(error.message);
  }

  return new ApiError(String(error));
};

/**
 * Helper to wrap effects with error handling
 */
export const catchAllErrors = <A, E, R>(effect: Effect.Effect<A, E, R>): Effect.Effect<A, CliError, R> =>
  Effect.catchAll(effect, (error) => Effect.fail(toCliError(error)));
