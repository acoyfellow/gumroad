# gr - AI-native CLI for Gumroad

An AI-native command-line interface for Gumroad, inspired by `gh` (GitHub CLI).

## Why Effect-TS Architecture

This CLI is built with Effect-TS to be truly "AI-native" - meaning the code structure makes it easier for AI agents like Claude Code to understand, use, and reason about.

### Traditional vs Effect-TS

**Traditional TypeScript (what most CLIs use):**

```typescript
async function getUser() {
  const data = await apiRequest("/user");
  // What errors can happen? Not visible in the type.
  // What does it need? Hidden dependencies.
}
```

**Effect-TS (this implementation):**

```typescript
const getUser = (): Effect.Effect<
  User,                                   // Success: returns User
  ConfigError | ApiError | NetworkError,  // Errors: must handle these
  never                                   // Dependencies: none needed
>
```

**Benefits for AI agents:**

1. **Self-documenting types**: The type signature tells Claude exactly what a function returns, what can fail, and what it needs
2. **Explicit error handling**: No surprise runtime errors - all failure modes are typed
3. **Composable operations**: Chain commands naturally with `Effect.gen`
4. **Testable by design**: Layer-based dependency injection makes mocking trivial

### Error Handling Comparison

| Aspect       | Traditional                   | Effect-TS                                   |
| ------------ | ----------------------------- | ------------------------------------------- |
| Errors       | `throw new Error()` - untyped | `Effect.fail(new ConfigError(...))` - typed |
| Handling     | `try/catch` blocks everywhere | `.pipe(Effect.catchAll(handler))`           |
| Visibility   | Runtime only                  | Compile-time visible                        |
| AI reasoning | Must guess what can fail      | Types show exactly what to handle           |

### Dependency Injection

**Traditional:** Hidden dependencies inside functions

```typescript
async function apiRequest(path: string) {
  const token = await getToken(); // Where does this come from?
  // ...
}
```

**Effect-TS:** Explicit dependencies via Context

```typescript
function makeRequest(path: string) {
  return Effect.gen(function* () {
    const auth = yield* AuthService; // Explicitly required
    const token = yield* auth.getToken();
    // ...
  });
}
```

**Benefit:** Dependencies are visible in types, making it easy for AI to understand what a function needs and how to provide it.

## Installation

```bash
npm install -g gr
```

Or locally:

```bash
npm link
```

## Authentication

```bash
gr auth login <your-token>
```

Get your token at: https://app.gumroad.com/api

## Usage

```bash
# Check auth status
gr auth status

# Authentication commands
gr auth login <token>
gr auth logout

# User info
gr user

# Products
gr products list
gr products get --id <product-id>

# Sales
gr sales list
gr sales list --product-id <id>
gr sales get --id <sale-id>

# Subscribers
gr subscribers list --product-id <id>

# Licenses
gr licenses verify --product-id <id> --key <license-key>
gr licenses verify --product-id <id> --key <license-key>
```

## Development

```bash
npm install
npm run build        # Build TypeScript
npm run build:types  # Regenerate types from OpenAPI
npm test             # Run tests
```

## Architecture

```
src/
├── main.ts           # CLI entry point and command routing
├── domain/
│   ├── types.ts      # Domain models (User, Product, Sale, etc.)
│   └── errors.ts     # Typed error classes
└── services/
    ├── Auth.ts       # Auth service with Effect Context
    ├── GumroadApi.ts # API client service
    └── services.test.ts  # Tests
```

## Testing

The CLI uses Effect-TS's Layer pattern for dependency injection, making tests clean and deterministic:

```typescript
const TestAuthLayer = Layer.succeed(
  AuthService,
  AuthService.of({
    getToken: () => Effect.succeed("test-token"),
    // ... mock implementations
  }),
);

const program = Effect.gen(function* () {
  const auth = yield* AuthService;
  const token = yield* auth.getToken();
  expect(token).toBe("test-token");
}).pipe(Effect.provide(TestAuthLayer));

await Effect.runPromise(program);
```

## Notes on Permissions

This CLI uses Personal Access Tokens (PAT) which support read operations (user, products, sales, subscribers, licenses) and license verification. Creating/updating products requires OAuth app permissions and is not available with PAT.

## API

The CLI uses the [Gumroad API v2](https://app.gumroad.com/api). Types are generated from the OpenAPI spec in `openapi.json`.

## License

MIT
