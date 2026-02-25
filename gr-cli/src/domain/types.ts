/**
 * User model from Gumroad API
 */
export interface User {
  id: string;
  name: string;
  email: string;
  login: string;
}

/**
 * Product model from Gumroad API
 */
export interface Product {
  id: string;
  name: string;
  price: number;
  currency: string;
  description: string;
  published: boolean;
  url: string;
  short_url: string;
  sales_count: number;
  sales_usd_cents: number;
  deleted: boolean;
  require_shipping: boolean;
  custom_summary: string;
}

/**
 * Sale model from Gumroad API
 */
export interface Sale {
  id: string;
  product_id: string;
  product_name: string;
  email: string;
  price: number;
  currency: string;
  created_at: string;
  chargeback?: boolean;
  refunded?: boolean;
  license_key?: string;
  ip_country?: string;
  card?: {
    visual?: string;
    type?: string;
  };
}

/**
 * Subscriber model from Gumroad API
 */
export interface Subscriber {
  id: string;
  product_id: string;
  product_name: string;
  email: string;
  created_at: string;
  cancelled?: boolean;
  ended_at?: string;
}

/**
 * License model from Gumroad API
 */
export interface License {
  id: string;
  product_id: string;
  product_name: string;
  key: string;
  email: string;
  created_at: string;
  cancelled?: boolean;
  refunded?: boolean;
}

/**
 * License verification result
 */
export interface LicenseVerification {
  success: boolean;
  uses: number;
  purchase: {
    id: string;
    product_id: string;
    product_name: string;
    email: string;
    price: number;
    currency: string;
    created_at: string;
  };
}

/**
 * API Response wrappers
 */
export interface UserResponse {
  success: boolean;
  user: User;
}

export interface ProductsResponse {
  success: boolean;
  products: Product[];
}

export interface ProductResponse {
  success: boolean;
  product: Product;
}

export interface SalesResponse {
  success: boolean;
  sales: Sale[];
  next_page?: number;
  next_page_key?: string;
}

export interface SaleResponse {
  success: boolean;
  sale: Sale;
}

export interface SubscribersResponse {
  success: boolean;
  subscribers: Subscriber[];
  next_page?: number;
  next_page_key?: string;
}

export interface LicensesResponse {
  success: boolean;
  licenses: License[];
}

export interface LicenseVerificationResponse {
  success: boolean;
  message?: string;
  uses?: number;
  purchase?: Sale;
}
