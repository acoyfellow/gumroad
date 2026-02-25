import { Effect, Context, Layer } from "effect";
import { ConfigError, ApiError, NetworkError } from "../domain/errors.js";
import { AuthService } from "./Auth.js";
import type {
  UserResponse,
  ProductsResponse,
  ProductResponse,
  SalesResponse,
  SaleResponse,
  SubscribersResponse,
  LicensesResponse,
  LicenseVerificationResponse,
} from "../domain/types.js";

const BASE_URL = "https://api.gumroad.com/v2";

/**
 * Gumroad API client service interface
 */
export interface GumroadClient {
  readonly getUser: () => Effect.Effect<UserResponse, ConfigError | ApiError | NetworkError, never>;
  readonly listProducts: () => Effect.Effect<ProductsResponse, ConfigError | ApiError | NetworkError, never>;
  readonly getProduct: (id: string) => Effect.Effect<ProductResponse, ConfigError | ApiError | NetworkError, never>;
  readonly listSales: (options?: {
    productId?: string;
    page?: number;
  }) => Effect.Effect<SalesResponse, ConfigError | ApiError | NetworkError, never>;
  readonly getSale: (id: string) => Effect.Effect<SaleResponse, ConfigError | ApiError | NetworkError, never>;
  readonly listSubscribers: (
    productId: string,
    options?: { page?: number },
  ) => Effect.Effect<SubscribersResponse, ConfigError | ApiError | NetworkError, never>;
  readonly verifyLicense: (
    productId: string,
    licenseKey: string,
  ) => Effect.Effect<LicenseVerificationResponse, ConfigError | ApiError | NetworkError, never>;
}

/**
 * GumroadClient tag for Effect Context
 */
export const GumroadClient = Context.GenericTag<GumroadClient>("GumroadClient");

/**
 * Helper to make authenticated API requests using fetch
 */
const makeRequest = (
  path: string,
  auth: AuthService,
  options?: { method?: "GET" | "POST"; body?: Record<string, string> },
): Effect.Effect<unknown, ConfigError | ApiError | NetworkError, never> =>
  Effect.gen(function* () {
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

    const response = yield* Effect.tryPromise({
      try: () => fetch(url, init),
      catch: (error) => new NetworkError(`Network error: ${error}`),
    });

    const text = yield* Effect.tryPromise({
      try: () => response.text(),
      catch: (error) => new ApiError(`Failed to read response: ${error}`),
    });

    if (!response.ok) {
      return yield* Effect.fail(new ApiError(`API error ${response.status}: ${text}`, response.status));
    }

    const json = yield* Effect.try({
      try: () => JSON.parse(text),
      catch: (error) => new ApiError(`Failed to parse JSON: ${error}`),
    });

    return json;
  });

/**
 * Live implementation of GumroadClient using fetch
 */
export const GumroadClientLive = Layer.effect(
  GumroadClient,
  Effect.gen(function* () {
    const auth = yield* AuthService;

    const getUser = () =>
      Effect.gen(function* () {
        const json = yield* makeRequest("/user", auth);
        return json as UserResponse;
      });

    const listProducts = () =>
      Effect.gen(function* () {
        const json = yield* makeRequest("/products", auth);
        return json as ProductsResponse;
      });

    const getProduct = (id: string) =>
      Effect.gen(function* () {
        const json = yield* makeRequest(`/products/${id}`, auth);
        return json as ProductResponse;
      });

    const listSales = (options?: { productId?: string; page?: number }) =>
      Effect.gen(function* () {
        let path = "/sales";
        const params = new URLSearchParams();
        if (options?.productId) params.append("product_id", options.productId);
        if (options?.page) params.append("page", String(options.page));
        if (params.toString()) path += `?${params.toString()}`;

        const json = yield* makeRequest(path, auth);
        return json as SalesResponse;
      });

    const getSale = (id: string) =>
      Effect.gen(function* () {
        const json = yield* makeRequest(`/sales/${id}`, auth);
        return json as SaleResponse;
      });

    const listSubscribers = (productId: string, options?: { page?: number }) =>
      Effect.gen(function* () {
        let path = `/products/${productId}/subscribers`;
        const params = new URLSearchParams();
        if (options?.page) params.append("page", String(options.page));
        if (params.toString()) path += `?${params.toString()}`;

        const json = yield* makeRequest(path, auth);
        return json as SubscribersResponse;
      });







    const verifyLicense = (productId: string, licenseKey: string) =>
      Effect.gen(function* () {
        const json = yield* makeRequest("/licenses/verify", auth, {
          method: "POST",
          body: { product_permalink: productId, license_key: licenseKey },
        });
        return json as LicenseVerificationResponse;
      });

    return GumroadClient.of({
      getUser,
      listProducts,
      getProduct,
      listSales,
      getSale,
      listSubscribers,

      verifyLicense,
    });
  }),
);

/**
 * Test implementation of GumroadClient for testing
 */
export const GumroadClientTest = (data: {
  user?: UserResponse;
  products?: ProductsResponse;
  sales?: SalesResponse;
}): Layer.Layer<GumroadClient> =>
  Layer.succeed(
    GumroadClient,
    GumroadClient.of({
      getUser: () =>
        Effect.succeed(
          data.user || { success: true, user: { id: "1", name: "Test", email: "test@test.com", login: "test" } },
        ),
      listProducts: () => Effect.succeed(data.products || { success: true, products: [] }),
      getProduct: () =>
        Effect.succeed({
          success: true,
          product: {
            id: "1",
            name: "Test",
            price: 100,
            currency: "usd",
            description: "Test",
            published: true,
            url: "",
            short_url: "",
            sales_count: 0,
            sales_usd_cents: 0,
            deleted: false,
            require_shipping: false,
            custom_summary: "",
          },
        }),
      listSales: () => Effect.succeed(data.sales || { success: true, sales: [] }),
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

      verifyLicense: () =>
        Effect.succeed({
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
        }),
    }),
  );
