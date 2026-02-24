#!/usr/bin/env node
/**
 * gr - AI-native CLI for Gumroad
 * 
 * Note: Creating/updating products requires OAuth app permissions.
 * This CLI supports read operations, publishing/unpublishing, sales, subscribers, and license management.
 */

import { readFile, writeFile, unlink } from "fs/promises"
import { existsSync } from "fs"

const CONFIG_PATH = process.env.HOME + "/.gr-config.json"
const BASE_URL = "https://api.gumroad.com/v2"

interface User {
  id: string
  name: string
  email: string
  login: string
}

interface Product {
  id: string
  name: string
  price: number
  currency: string
  created_at: string
  published: boolean
}

interface Sale {
  id: string
  product_id: string
  amount: number
  currency: string
  created_at: string
  buyer_email: string
  license_key?: string
}

async function getToken(): Promise<string> {
  if (!existsSync(CONFIG_PATH)) {
    throw new Error("Not logged in. Run: gr auth login <token>")
  }
  const data = JSON.parse(await readFile(CONFIG_PATH, "utf-8"))
  if (!data.token) throw new Error("Invalid config. Run: gr auth login <token>")
  return data.token
}

async function saveToken(token: string): Promise<void> {
  await writeFile(CONFIG_PATH, JSON.stringify({ token }, null, 2))
  console.log("Token saved to ~/.gr-config.json")
}

async function deleteToken(): Promise<void> {
  if (existsSync(CONFIG_PATH)) {
    await unlink(CONFIG_PATH)
    console.log("Token removed from ~/.gr-config.json")
  }
}

async function apiRequest<T>(path: string, method = "GET", body?: Record<string, unknown>): Promise<T> {
  const token = await getToken()
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const json = (await res.json()) as { error?: string; message?: string }
  if (!res.ok) {
    throw new Error(json.error || json.message || `API error: ${res.status}`)
  }
  return json as T
}

type CommandHandler = (args: string[]) => Promise<void>

const commands: Record<string, CommandHandler> = {
  help: async (): Promise<void> => {
    console.log(`
gr - AI-native CLI for Gumroad

Usage: gr <command> [options]

Commands:
  auth login <token>   Save your Gumroad API token
  auth logout          Remove saved token
  auth status          Check if logged in
  user                 Get current user info
  products list        List all products
  products get <id>    Get product by ID
  products enable <id> Enable/publish a product
  products disable <id> Disable/unpublish a product
  sales list           List all sales
  sales get <id>       Get sale by ID
  sales refund <id>    Refund a sale
  subscribers list <product-id>  List subscribers for a product
  subscribers get <id> Get subscriber by ID
  licenses verify <product-id> <key> Verify a license key
  licenses enable <key> Enable/reactivate a license
  licenses disable <key> Disable/deactivate a license

Note: Creating products requires OAuth app permissions. Use web UI to create,
then use this CLI to publish, check sales, and manage licenses.

Options:
  --help, -h          Show this help
  --version, -v       Show version

Examples:
  gr auth login eyJhbGciOiJIUzI1NiJ9...
  gr user
  gr products list
  gr products enable PRODUCT_ID
  gr licenses verify PRODUCT_ID LICENSE_KEY
    `.trim())
  },

  "auth:login": async (args: string[]): Promise<void> => {
    const token = args[0]
    if (!token) {
      console.error("Error: Token required. Usage: gr auth login <token>")
      process.exit(1)
    }
    await saveToken(token)
  },

  "auth:logout": async (): Promise<void> => {
    await deleteToken()
  },

  "auth:status": async (): Promise<void> => {
    try {
      await getToken()
      console.log("Logged in")
    } catch {
      console.log("Not logged in")
    }
  },

  user: async (): Promise<void> => {
    const data = await apiRequest<{ user: User }>("/user")
    console.log(JSON.stringify(data.user, null, 2))
  },

  "products:list": async (): Promise<void> => {
    const data = await apiRequest<{ products: Product[] }>("/products")
    console.log(JSON.stringify(data.products, null, 2))
  },

  "products:get": async (args: string[]): Promise<void> => {
    const id = args[0]
    if (!id) {
      console.error("Error: Product ID required. Usage: gr products get <id>")
      process.exit(1)
    }
    const data = await apiRequest<{ product: Product }>(`/products/${id}`)
    console.log(JSON.stringify(data.product, null, 2))
  },

  "products:enable": async (args: string[]): Promise<void> => {
    const id = args[0]
    if (!id) {
      console.error("Error: Product ID required. Usage: gr products enable <id>")
      process.exit(1)
    }
    await apiRequest<void>(`/products/${id}/enable`, "PUT")
    console.log(`Product ${id} enabled/published`)
  },

  "products:disable": async (args: string[]): Promise<void> => {
    const id = args[0]
    if (!id) {
      console.error("Error: Product ID required. Usage: gr products disable <id>")
      process.exit(1)
    }
    await apiRequest<void>(`/products/${id}/disable`, "PUT")
    console.log(`Product ${id} disabled/unpublished`)
  },

  "sales:list": async (): Promise<void> => {
    const data = await apiRequest<{ sales: Sale[] }>("/sales")
    console.log(JSON.stringify(data.sales, null, 2))
  },

  "sales:get": async (args: string[]): Promise<void> => {
    const id = args[0]
    if (!id) {
      console.error("Error: Sale ID required. Usage: gr sales get <id>")
      process.exit(1)
    }
    const data = await apiRequest<{ sale: Sale }>(`/sales/${id}`)
    console.log(JSON.stringify(data.sale, null, 2))
  },

  "sales:refund": async (args: string[]): Promise<void> => {
    const id = args[0]
    if (!id) {
      console.error("Error: Sale ID required. Usage: gr sales refund <id>")
      process.exit(1)
    }
    await apiRequest<void>(`/sales/${id}/refund`, "PUT")
    console.log(`Sale ${id} refunded`)
  },

  "subscribers:list": async (args: string[]): Promise<void> => {
    const productId = args[0]
    if (!productId) {
      console.error("Error: Product ID required. Usage: gr subscribers list <product-id>")
      process.exit(1)
    }
    const data = await apiRequest<{ subscribers: any[] }>(`/products/${productId}/subscribers`)
    console.log(JSON.stringify(data, null, 2))
  },

  "subscribers:get": async (args: string[]): Promise<void> => {
    const id = args[0]
    if (!id) {
      console.error("Error: Subscriber ID required. Usage: gr subscribers get <id>")
      process.exit(1)
    }
    const data = await apiRequest<{ subscriber: any }>(`/subscribers/${id}`)
    console.log(JSON.stringify(data.subscriber, null, 2))
  },

  "licenses:verify": async (args: string[]): Promise<void> => {
    const productId = args[0]
    const key = args[1]
    if (!productId || !key) {
      console.error("Error: Product ID and license key required. Usage: gr licenses verify <product-id> <key>")
      process.exit(1)
    }
    const data = await apiRequest<{ success: boolean; purchase?: Sale; uses?: number }>("/licenses/verify", "POST", {
      product_id: productId,
      license_key: key,
    })
    console.log(JSON.stringify({ 
      valid: data.success, 
      uses: data.uses,
      purchase: data.purchase 
    }, null, 2))
  },

  "licenses:enable": async (args: string[]): Promise<void> => {
    const key = args[0]
    if (!key) {
      console.error("Error: License key required. Usage: gr licenses enable <key>")
      process.exit(1)
    }
    await apiRequest<void>("/licenses/enable", "PUT", { license_key: key })
    console.log(`License ${key} enabled`)
  },

  "licenses:disable": async (args: string[]): Promise<void> => {
    const key = args[0]
    if (!key) {
      console.error("Error: License key required. Usage: gr licenses disable <key>")
      process.exit(1)
    }
    await apiRequest<void>("/licenses/disable", "PUT", { license_key: key })
    console.log(`License ${key} disabled`)
  },
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)

  if (args[0] === "--version" || args[0] === "-v") {
    console.log("gr v0.1.0")
    return
  }

  if (args[0] === "--help" || args[0] === "-h" || args.length === 0) {
    await commands.help([])
    return
  }

  const cmd = args[0] === "auth" && args[1]
    ? `auth:${args[1]}`
    : args[1]
      ? `${args[0]}:${args[1]}`
      : args[0]

  const handler = commands[cmd]
  if (!handler) {
    console.error(`Error: Unknown command '${args.join(" ")}'`)
    console.error("Run 'gr --help' for usage information")
    process.exit(1)
  }

  const commandArgs = args[0] === "auth" ? args.slice(2) : args.slice(2)

  try {
    await handler(commandArgs)
  } catch (e) {
    console.error(`Error: ${e instanceof Error ? e.message : e}`)
    process.exit(1)
  }
}

main()
