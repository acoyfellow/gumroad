import { Effect, Context, Layer } from "effect";
import * as NodeFileSystem from "@effect/platform-node/NodeFileSystem";
import { FileSystem } from "@effect/platform/FileSystem";
import { Path } from "@effect/platform/Path";
import * as NodePath from "@effect/platform-node/NodePath";
import { ConfigError } from "../domain/errors.js";

const CONFIG_PATH = `${process.env.HOME}/.gr-config.json`;

/**
 * Auth token configuration interface
 */
export interface AuthConfig {
  readonly token: string;
}

/**
 * Auth service interface using Effect
 */
export interface AuthService {
  readonly getToken: () => Effect.Effect<string, ConfigError, never>;
  readonly saveToken: (token: string) => Effect.Effect<void, ConfigError, never>;
  readonly deleteToken: () => Effect.Effect<void, ConfigError, never>;
  readonly isAuthenticated: () => Effect.Effect<boolean, never, never>;
}

/**
 * Auth service tag for Effect Context
 */
export const AuthService = Context.GenericTag<AuthService>("AuthService");

/**
 * Live implementation of AuthService using file system
 */
export const AuthServiceLive = Layer.effect(
  AuthService,
  Effect.gen(function* () {
    const fs = yield* FileSystem;

    const getToken = (): Effect.Effect<string, ConfigError, never> =>
      Effect.gen(function* () {
        const exists = yield* fs.exists(CONFIG_PATH);
        if (!exists) {
          return yield* Effect.fail(new ConfigError("Not logged in. Run: gr auth login <token>"));
        }

        const content = yield* fs.readFileString(CONFIG_PATH);
        const parsed = yield* Effect.try({
          try: () => JSON.parse(content) as AuthConfig,
          catch: () => new ConfigError("Invalid config file. Run: gr auth login <token>"),
        });

        if (!parsed.token) {
          return yield* Effect.fail(new ConfigError("No token found. Run: gr auth login <token>"));
        }

        return parsed.token;
      }).pipe(
        Effect.catchAll((error) => {
          if (error instanceof ConfigError) {
            return Effect.fail(error);
          }
          return Effect.fail(new ConfigError(`File system error: ${error}`));
        }),
      );

    const saveToken = (token: string): Effect.Effect<void, ConfigError, never> =>
      Effect.gen(function* () {
        const config: AuthConfig = { token };
        const content = JSON.stringify(config, null, 2);
        yield* fs.writeFileString(CONFIG_PATH, content);
      }).pipe(Effect.catchAll((error) => Effect.fail(new ConfigError(`Failed to save token: ${error}`))));

    const deleteToken = (): Effect.Effect<void, ConfigError, never> =>
      Effect.gen(function* () {
        const exists = yield* fs.exists(CONFIG_PATH);
        if (exists) {
          yield* fs.remove(CONFIG_PATH);
        }
      }).pipe(Effect.catchAll((error) => Effect.fail(new ConfigError(`Failed to delete token: ${error}`))));

    const isAuthenticated = (): Effect.Effect<boolean, never, never> =>
      Effect.gen(function* () {
        const exists = yield* fs.exists(CONFIG_PATH).pipe(Effect.orElseSucceed(() => false));
        if (!exists) return false;

        const content = yield* fs.readFileString(CONFIG_PATH).pipe(Effect.orElseSucceed(() => ""));

        const parsed = yield* Effect.try({
          try: () => JSON.parse(content) as AuthConfig,
          catch: () => ({ token: "" }),
        }).pipe(Effect.orElseSucceed(() => ({ token: "" })));

        return !!parsed.token;
      }).pipe(Effect.orElseSucceed(() => false));

    return AuthService.of({
      getToken,
      saveToken,
      deleteToken,
      isAuthenticated,
    });
  }),
).pipe(Layer.provide(NodeFileSystem.layer), Layer.provide(NodePath.layer));

/**
 * Test implementation of AuthService for testing
 */
export const AuthServiceTest = (token: string): Layer.Layer<AuthService> =>
  Layer.succeed(
    AuthService,
    AuthService.of({
      getToken: () => Effect.succeed(token),
      saveToken: () => Effect.void,
      deleteToken: () => Effect.void,
      isAuthenticated: () => Effect.succeed(true),
    }),
  );
