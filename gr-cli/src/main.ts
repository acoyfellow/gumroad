#!/usr/bin/env node
/**
 * gr - AI-native CLI for Gumroad (Effect-TS version)
 */

import { Effect } from "effect";
import { ConfigError, ApiError, NetworkError, ValidationError } from "./domain/errors.js";
import type {
  UserResponse,
  ProductsResponse,
  ProductResponse,
  SalesResponse,
  SaleResponse,
  SubscribersResponse,
  LicensesResponse,
  LicenseVerificationResponse,
} from "./domain/types.js";
import { AuthServiceLive, AuthService } from "./services/Auth.js";

const VERSION = "0.1.0";
const BASE_URL = "https://api.gumroad.com/v2";
// Sanitize ID to prevent path traversal attacks
const sanitizeId = (id: string): string => {
  // Remove any characters that aren't alphanumeric, hyphen, or underscore
  return id.replace(/[^a-zA-Z0-9-_]/g, "");
};

// Validate that sanitized ID is not empty
const validateId = (id: string): string | null => {
  const sanitized = sanitizeId(id);
  return sanitized.length > 0 ? sanitized : null;
};
function showHelp() {
  console.log(`
gr - AI-native CLI for Gumroad v${VERSION}

Usage: gr <command> [options]

Commands:
  auth login <token>     Save your Gumroad API token
  auth logout            Remove saved token
  auth status            Check if logged in
  user                   Get current user info
  products list          List all products
  products get --id <id> Get product by ID
  sales list             List all sales
  sales get --id <id>   Get sale by ID
  subscribers list       List subscribers for a product
  licenses verify        Verify a license key


Get your API token at: https://app.gumroad.com/api
  `);
}

// Helper to make API requests
function makeRequest(
  path: string,
  options?: { method?: "GET" | "POST"; body?: Record<string, string> }
): Effect.Effect<unknown, ConfigError | ApiError | NetworkError, never> {
  return Effect.gen(function* () {
    const auth = yield* AuthService;
    const token = yield* auth.getToken();
    
    const url = `${BASE_URL}${path}`;
    const init: RequestInit = {
      method: options?.method || "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        ...(options?.body ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
      },
      ...(options?.body ? { body: new URLSearchParams(options.body) } : {}),
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
    
    const response = yield* Effect.tryPromise({
      try: () => fetch(url, { ...init, signal: controller.signal }),
      catch: (error) => {
        clearTimeout(timeoutId);
        if (error instanceof Error && error.name === "AbortError") {
          return new NetworkError("Request timeout after 30 seconds");
        }
        return new NetworkError(`Network error: ${error}`);
      },
    }).pipe(Effect.tap(() => clearTimeout(timeoutId)));


    const text = yield* Effect.tryPromise({
      try: () => response.text(),
      catch: (error) => new ApiError(`Failed to read response: ${error}`),
    });

    if (!response.ok) {
      return yield* Effect.fail(
        new ApiError(`API error ${response.status}: ${text}`, response.status)
      );
    }

    const json = yield* Effect.try({
      try: () => JSON.parse(text),
      catch: (error) => new ApiError(`Failed to parse JSON: ${error}`),
    });

    return json;
  }).pipe(Effect.provide(AuthServiceLive));
}

// Command implementations
const authLogin = (token: string) =>
  Effect.gen(function* () {
    const auth = yield* AuthService;
    yield* auth.saveToken(token);
    console.log("Token saved to ~/.gr-config.json");
  }).pipe(Effect.provide(AuthServiceLive));

const authLogout = () =>
  Effect.gen(function* () {
    const auth = yield* AuthService;
    yield* auth.deleteToken();
    console.log("Token removed from ~/.gr-config.json");
  }).pipe(Effect.provide(AuthServiceLive));

const authStatus = () =>
  Effect.gen(function* () {
    const auth = yield* AuthService;
    const isAuth = yield* auth.isAuthenticated();
    console.log(isAuth ? "Authenticated" : "Not authenticated");
  }).pipe(Effect.provide(AuthServiceLive));

const userCmd = () =>
  Effect.gen(function* () {
    const json = yield* makeRequest("/user");
    const response = json as UserResponse;
    console.log(JSON.stringify(response.user, null, 2));
  });

const productsList = () =>
  Effect.gen(function* () {
    const json = yield* makeRequest("/products");
    const response = json as ProductsResponse;
    console.log(JSON.stringify(response.products, null, 2));
  });

const productsGet = (rawId: string) =>
  Effect.gen(function* () {
    const id = validateId(rawId);
    if (!id) {
      return yield* Effect.fail(new ValidationError("Invalid product ID"));
    }
    const json = yield* makeRequest(`/products/${id}`);
    const response = json as ProductResponse;
    console.log(JSON.stringify(response.product, null, 2));
  });


const salesList = (productId?: string) =>
  Effect.gen(function* () {
    let path = "/sales";
    const params = new URLSearchParams();
    if (productId) params.append("product_id", productId);
    if (params.toString()) path += `?${params.toString()}`;
    
    const json = yield* makeRequest(path);
    const response = json as SalesResponse;
    console.log(JSON.stringify(response.sales, null, 2));
  });

const salesGet = (rawId: string) =>
  Effect.gen(function* () {
    const id = validateId(rawId);
    if (!id) {
      return yield* Effect.fail(new ValidationError("Invalid sale ID"));
    }
    const json = yield* makeRequest(`/sales/${id}`);
    const response = json as SaleResponse;
    console.log(JSON.stringify(response.sale, null, 2));
  });


const subscribersList = (rawProductId: string) =>
  Effect.gen(function* () {
    const productId = validateId(rawProductId);
    if (!productId) {
      return yield* Effect.fail(new ValidationError("Invalid product ID"));
    }
    const json = yield* makeRequest(`/products/${productId}/subscribers`);
    const response = json as SubscribersResponse;
    console.log(JSON.stringify(response.subscribers, null, 2));
  });


const licensesVerify = (rawProductId: string, licenseKey: string) =>
  Effect.gen(function* () {
    const productId = validateId(rawProductId);
    if (!productId) {
      return yield* Effect.fail(new ValidationError("Invalid product ID"));
    }
    if (!licenseKey || licenseKey.trim().length === 0) {
      return yield* Effect.fail(new ValidationError("License key is required"));
    }
    const json = yield* makeRequest("/licenses/verify", {
      method: "POST",
      body: { product_permalink: productId, license_key: licenseKey.trim() },
    });
    const response = json as LicenseVerificationResponse;
    console.log(JSON.stringify(response, null, 2));
  });


// Main CLI
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    showHelp();
    return;
  }
  
  const command = args[0];
  const subcommand = args[1];
  
  try {
    if (command === "auth") {
      if (subcommand === "login") {
        const token = args[2];
        if (!token) {
          console.error("Error: Token required. Usage: gr auth login <token>");
          process.exit(1);
        }
        await Effect.runPromise(authLogin(token));
      } else if (subcommand === "logout") {
        await Effect.runPromise(authLogout());
      } else if (subcommand === "status") {
        await Effect.runPromise(authStatus());
      } else {
        console.error("Error: Unknown auth subcommand. Use: login, logout, status");
        process.exit(1);
      }
    } else if (command === "user") {
      await Effect.runPromise(userCmd());
    } else if (command === "products") {
      if (subcommand === "list") {
        await Effect.runPromise(productsList());
      } else if (subcommand === "get") {
        const idIndex = args.indexOf("--id");
        const id = idIndex >= 0 ? args[idIndex + 1] : undefined;
        if (!id) {
          console.error("Error: --id required. Usage: gr products get --id <id>");
          process.exit(1);
        }
        await Effect.runPromise(productsGet(id));
      } else {
        console.error("Error: Unknown products subcommand. Use: list, get");
        process.exit(1);
      }
    } else if (command === "sales") {
      if (subcommand === "list") {
        const productIdIndex = args.indexOf("--product-id");
        const productId = productIdIndex >= 0 ? args[productIdIndex + 1] : undefined;
        await Effect.runPromise(salesList(productId));
      } else if (subcommand === "get") {
        const idIndex = args.indexOf("--id");
        const id = idIndex >= 0 ? args[idIndex + 1] : undefined;
        if (!id) {
          console.error("Error: --id required. Usage: gr sales get --id <id>");
          process.exit(1);
        }
        await Effect.runPromise(salesGet(id));
      } else {
        console.error("Error: Unknown sales subcommand. Use: list, get");
        process.exit(1);
      }
    } else if (command === "subscribers") {
      if (subcommand === "list") {
        const productIdIndex = args.indexOf("--product-id");
        const productId = productIdIndex >= 0 ? args[productIdIndex + 1] : undefined;
        if (!productId) {
          console.error("Error: --product-id required. Usage: gr subscribers list --product-id <id>");
          process.exit(1);
        }
        await Effect.runPromise(subscribersList(productId));
      } else {
        console.error("Error: Unknown subscribers subcommand. Use: list");
        process.exit(1);
      }
    } else if (command === "licenses") {
      if (subcommand === "verify") {
        const productIdIndex = args.indexOf("--product-id");

        const keyIndex = args.indexOf("--key");
        const productId = productIdIndex >= 0 ? args[productIdIndex + 1] : undefined;
        const key = keyIndex >= 0 ? args[keyIndex + 1] : undefined;
        if (!productId || !key) {
          console.error("Error: --product-id and --key required. Usage: gr licenses verify --product-id <id> --key <key>");
          process.exit(1);
        }
        await Effect.runPromise(licensesVerify(productId, key));
      } else {
        console.error("Error: Unknown licenses subcommand. Use: verify");
        process.exit(1);
      }
    } else {
      console.error(`Error: Unknown command "${command}". Run gr --help for usage.`);
      process.exit(1);
    }
  } catch (error) {

    if (error instanceof ConfigError) {
      console.error("Config error:", error.message);
    } else if (error instanceof ApiError) {
      console.error(`API error ${error.statusCode}:`, error.message);
    } else if (error instanceof NetworkError) {
      console.error("Network error:", error.message);
    } else if (error instanceof ValidationError) {
      console.error("Validation error:", error.message);
    } else {
      console.error("Error:", error instanceof Error ? error.message : String(error));
    }
    process.exit(1);
  }
}

main();
