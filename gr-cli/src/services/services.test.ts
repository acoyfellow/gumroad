import { describe, expect, it } from "vitest";
import { Effect, Layer } from "effect";
import { AuthService } from "./Auth.js";
import { GumroadClient } from "./GumroadApi.js";
import { ConfigError, ApiError, NetworkError } from "../domain/errors.js";
import type { UserResponse, ProductsResponse, LicenseVerificationResponse } from "../domain/types.js";

// Test layer with success
const TestAuthLayer = Layer.succeed(
  AuthService,
  AuthService.of({
    getToken: () => Effect.succeed("test-token"),
    saveToken: () => Effect.void,
    deleteToken: () => Effect.void,
    isAuthenticated: () => Effect.succeed(true),
  }),
);

// Test layer with error
const TestAuthErrorLayer = Layer.succeed(
  AuthService,
  AuthService.of({
    getToken: () => Effect.fail(new ConfigError("Not logged in")),
    saveToken: () => Effect.void,
    deleteToken: () => Effect.void,
    isAuthenticated: () => Effect.succeed(false),
  }),
);

const mockUser: UserResponse = {
  success: true,
  user: {
    id: "test-user-123",
    name: "Test User",
    email: "test@example.com",
    login: "testuser",
  },
};

const mockProducts: ProductsResponse = {
  success: true,
  products: [
    {
      id: "prod-1",
      name: "Test Product",
      price: 1000,
      currency: "usd",
      description: "A test product",
      published: true,
      url: "https://gumroad.com/test",
      short_url: "https://gum.co/test",
      sales_count: 5,
      sales_usd_cents: 5000,
      deleted: false,
      require_shipping: false,
      custom_summary: "Test summary",
    },
  ],
};

const mockLicenseVerify: LicenseVerificationResponse = {
  success: true,
  uses: 1,
  purchase: {
    id: "1",
    product_id: "1",
    product_name: "Test",
    email: "test@test.com",
    price: 100,
    currency: "usd",
    created_at: new Date().toISOString(),
  },
};

const TestClientLayer = Layer.succeed(
  GumroadClient,
  GumroadClient.of({
    getUser: () => Effect.succeed(mockUser),
    listProducts: () => Effect.succeed(mockProducts),
    getProduct: () => Effect.succeed({ success: true, product: mockProducts.products[0] }),
    listSales: () => Effect.succeed({ success: true, sales: [] }),
    getSale: () =>
      Effect.succeed({
        success: true,
        sale: {
          id: "1",
          product_id: "1",
          product_name: "Test",
          email: "test@test.com",
          price: 100,
          currency: "usd",
          created_at: new Date().toISOString(),
        },
      }),
    listSubscribers: () => Effect.succeed({ success: true, subscribers: [] }),
    verifyLicense: (_productId: string, _licenseKey: string) => Effect.succeed(mockLicenseVerify),
  }),
);

// Test layer with API errors
const TestClientErrorLayer = Layer.succeed(
  GumroadClient,
  GumroadClient.of({
    getUser: () => Effect.fail(new ApiError("Unauthorized", 401)),
    listProducts: () => Effect.fail(new ApiError("Rate limited", 429)),
    getProduct: () => Effect.fail(new ApiError("Product not found", 404)),
    listSales: () => Effect.fail(new NetworkError("Network timeout")),
    getSale: () => Effect.fail(new ApiError("Sale not found", 404)),
    listSubscribers: () => Effect.succeed({ success: true, subscribers: [] }),
    verifyLicense: (_productId: string, _licenseKey: string) => Effect.succeed(mockLicenseVerify),
  }),
);

describe("AuthService", () => {
  it("provides test token", async () => {
    const program = Effect.gen(function* () {
      const auth = yield* AuthService;
      const token = yield* auth.getToken();
      expect(token).toBe("test-token");
    }).pipe(Effect.provide(TestAuthLayer));

    await Effect.runPromise(program);
  });

  it("reports authenticated status", async () => {
    const program = Effect.gen(function* () {
      const auth = yield* AuthService;
      const isAuth = yield* auth.isAuthenticated();
      expect(isAuth).toBe(true);
    }).pipe(Effect.provide(TestAuthLayer));

    await Effect.runPromise(program);
  });

  it("fails with ConfigError when token not found", async () => {
    const program = Effect.gen(function* () {
      const auth = yield* AuthService;
      const result = yield* auth.getToken().pipe(
        Effect.match({
          onSuccess: () => "success",
          onFailure: (error) => error._tag,
        }),
      );
      expect(result).toBe("ConfigError");
    }).pipe(Effect.provide(TestAuthErrorLayer));

    await Effect.runPromise(program);
  });
});

describe("GumroadClient", () => {
  it("gets user", async () => {
    const program = Effect.gen(function* () {
      const client = yield* GumroadClient;
      const response = yield* client.getUser();
      expect(response.success).toBe(true);
      expect(response.user.name).toBe("Test User");
    }).pipe(Effect.provide(TestClientLayer));

    await Effect.runPromise(program);
  });

  it("lists products", async () => {
    const program = Effect.gen(function* () {
      const client = yield* GumroadClient;
      const response = yield* client.listProducts();
      expect(response.success).toBe(true);
      expect(response.products).toHaveLength(1);
      expect(response.products[0].name).toBe("Test Product");
    }).pipe(Effect.provide(TestClientLayer));

    await Effect.runPromise(program);
  });

  it("verifies license with product_permalink", async () => {
    const program = Effect.gen(function* () {
      const client = yield* GumroadClient;
      const response = yield* client.verifyLicense("test-product", "LICENSE-KEY-123");
      expect(response.success).toBe(true);
      expect(response.uses).toBe(1);
      expect(response.purchase?.product_name).toBe("Test");
    }).pipe(Effect.provide(TestClientLayer));

    await Effect.runPromise(program);
  });

  it("handles ApiError on authentication failure", async () => {
    const program = Effect.gen(function* () {
      const client = yield* GumroadClient;
      const result = yield* client.getUser().pipe(
        Effect.match({
          onSuccess: () => "success",
          onFailure: (error) => {
            if (error instanceof ApiError) {
              return `ApiError:${error.statusCode}`;
            }
            return "unknown";
          },
        }),
      );
      expect(result).toBe("ApiError:401");
    }).pipe(Effect.provide(TestClientErrorLayer));

    await Effect.runPromise(program);
  });

  it("handles ApiError on rate limiting", async () => {
    const program = Effect.gen(function* () {
      const client = yield* GumroadClient;
      const result = yield* client.listProducts().pipe(
        Effect.match({
          onSuccess: () => "success",
          onFailure: (error) => {
            if (error instanceof ApiError) {
              return `ApiError:${error.statusCode}:${error.message}`;
            }
            return "unknown";
          },
        }),
      );
      expect(result).toBe("ApiError:429:Rate limited");
    }).pipe(Effect.provide(TestClientErrorLayer));

    await Effect.runPromise(program);
  });

  it("handles NetworkError on connection issues", async () => {
    const program = Effect.gen(function* () {
      const client = yield* GumroadClient;
      const result = yield* client.listSales().pipe(
        Effect.match({
          onSuccess: () => "success",
          onFailure: (error) => error._tag,
        }),
      );
      expect(result).toBe("NetworkError");
    }).pipe(Effect.provide(TestClientErrorLayer));

    await Effect.runPromise(program);
  });
});
