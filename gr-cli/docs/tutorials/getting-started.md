# Tutorials

Step-by-step guides to learn gr from scratch.

## Prerequisites

- Node.js 18+
- npm or yarn
- A Gumroad account with API access

## Installing gr

```bash
# Clone the repository
git clone https://github.com/your-fork/gr-cli.git
cd gr-cli

# Install dependencies
npm install

# Build
npm run build

# Link for local testing
npm link
```

## Tutorial: Your First Commands

### Step 1: Authenticate

Get your API token from https://app.gumroad.com/api, then:

```bash
gr auth login YOUR_TOKEN
```

Verify it's working:

```bash
gr auth status
# Output: Logged in
```

### Step 2: Get User Info

```bash
gr user
```

### Step 3: List Products

```bash
gr products list
```

### Step 4: Verify a License

```bash
gr licenses verify ABC123-DEF456
```

## Tutorial: Using as an AI Agent

### Setup for AI Agents

AI agents can use the same CLI. Just ensure the token is saved:

```bash
gr auth login YOUR_TOKEN
# Token stored in ~/.gr-config.json
```

Agents then run commands via `child_process`:

```javascript
import { execSync } from "child_process";

const user = JSON.parse(execSync("gr user").toString());
console.log(user.name);
```

### Example: License Verification Agent

See `examples/02-agent-license-verify.js` for a complete workflow.
