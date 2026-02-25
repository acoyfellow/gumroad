# How-To Guides

Practical guides for specific tasks.

## How to Authenticate

### Using the CLI

```bash
gr auth login YOUR_GUMROAD_TOKEN
```

### Getting Your Token

1. Go to https://app.gumroad.com/api
2. Create a new application
3. Generate an access token
4. Use that token with `gr auth login`

### Using in Code

```javascript
import fetch from "node:fetch";

const config = JSON.parse(await fs.readFile("~/.gr-config.json"));
const token = config.token;
```

## How to Check Sales

```bash
# List recent sales
gr sales list

# Get specific sale
gr sales get SALE_ID
```

## How to Verify Licenses

```bash
# Verify a license key
gr licenses verify LICENSE_KEY

# With specific product
gr licenses verify LICENSE_KEY --product-id PRODUCT_ID
```

## How to List Products

```bash
# All products
gr products list

# Specific product
gr products get PRODUCT_ID
```

## How to Check Subscribers

```bash
# List subscribers
gr subscribers list

# Get specific subscriber
gr subscribers get SUBSCRIBER_ID
```
