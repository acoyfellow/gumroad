# gr - AI-native CLI for Gumroad

An AI-native command-line interface for Gumroad, inspired by `gh` (GitHub CLI).

**Note on Permissions:** This CLI uses Personal Access Tokens (PAT) which support read operations (user, products, sales, subscribers, licenses) and license verification. Creating/updating products requires OAuth app permissions and is not available with PAT.

An AI-native command-line interface for Gumroad, inspired by `gh` (GitHub CLI).

## Why This Matters for AI Agents

- **Typed API**: Types auto-generated from OpenAPI spec - changes caught early
- **Type-safe**: Full TypeScript coverage with auto-generated API types
- **JSON output**: AI agents consume easily
- **gh ergonomics**: Familiar CLI patterns (`gr auth`, `gr products list`)

## Tech Stack Justification

| Component      | Choice                 | Rationale                                              |
| -------------- | ---------------------- | ------------------------------------------------------ |
| Language       | TypeScript             | Same as modern tooling, AI-friendly, great IDE support |
| Types          | OpenAPI auto-generated | Single source of truth, catches API changes            |
| Runtime        | Node.js                | Cross-platform, npm distribution                       |
| Error handling | try/catch with clear messages | Easy to debug, human-readable errors              |

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

# Get current user
gr user

# List products
gr products list
gr products get <id>

# List sales
gr sales list
gr sales get <id>
# Verify license
gr licenses verify <key>
```
# List subscribers
gr subscribers list
gr subscribers get <id>

# Verify license
gr licenses verify <key>
gr licenses list
```

## Development

```bash
npm install
npm run build        # Build TypeScript
npm run build:types  # Regenerate types from OpenAPI
npm test             # Run tests
```

## API

The CLI uses the [Gumroad API v2](https://app.gumroad.com/api). Types are auto-generated from the OpenAPI spec in `openapi.json`.

## License

MIT
