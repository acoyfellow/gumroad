#!/usr/bin/env node
/**
 * Example: Claude Code using gr CLI
 *
 * This shows how Claude Code (or any AI coding assistant) can use the gr CLI
 * to help a developer with their Gumroad integration.
 *
 * Use case: Developer asks "Is this license key valid?"
 * Claude Code runs gr CLI to check without manual lookup.
 */

import { execSync } from "child_process";

/**
 * Claude Code would use this pattern internally:
 * When a developer asks about Gumroad data, Claude calls gr CLI
 */
function claudeCodeQuery(command: string): string {
  try {
    const output = execSync(`gr ${command}`, { encoding: "utf-8" });
    return output.trim();
  } catch (e) {
    return `Error: ${e instanceof Error ? e.message : e}`;
  }
}

// Example: Developer asks "What's my Gumroad user info?"
console.log("Claude: Let me check your Gumroad account...");
const userInfo = claudeCodeQuery("user");
console.log(userInfo);

// Example: Developer asks "Verify this license for product PROD123: ABC123"
const productId = process.argv[2] || "PROD123-DEMO";
const licenseKey = process.argv[3] || "ABC123-DEMO-KEY";
console.log(`\nClaude: Verifying license ${licenseKey} for product ${productId}...`);
const licenseInfo = claudeCodeQuery(`licenses verify --product-id ${productId} --key ${licenseKey}`);
const licenseKey = process.argv[2] || "ABC123-DEMO-KEY";
console.log(`\nClaude: Verifying license ${licenseKey}...`);
const licenseInfo = claudeCodeQuery(`licenses verify ${licenseKey}`);
console.log(licenseInfo);

// Example: Developer asks "List my products"
console.log("\nClaude: Fetching your products...");
const products = claudeCodeQuery("products list");
console.log(products);
