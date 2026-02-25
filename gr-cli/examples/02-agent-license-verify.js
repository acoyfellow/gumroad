#!/usr/bin/env node
/**
 * Example 2: AI Agent verifying customer licenses
 *
 * Use case: An AI support agent that helps users with license issues.
 * The agent can verify if a license key is valid without human intervention.
 *
 * This is THE killer feature for AI agents - license verification.
 *
 * Run: node examples/02-agent-license-verify.js <license-key> [product-id]
 * Example: node examples/02-agent-license-verify.js ABC123-DEF456
 */

const CONFIG_PATH = process.env.HOME + "/.gr-config.json";

async function verifyLicense(key, productId = null) {
  const fs = await import("fs/promises");
  const config = JSON.parse(await fs.readFile(CONFIG_PATH, "utf-8"));

  const body = productId ? { key, product_id: productId } : { key };

  const res = await fetch("https://api.gumroad.com/v2/licenses/verify", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  return res.json();
}

// Agent workflow: Customer asks "Is my license valid?"
async function agentWorkflow(customerKey) {
  console.log(`[Agent] Verifying license: ${customerKey}`);

  const result = await verifyLicense(customerKey);

  if (result.success) {
    console.log(`[Agent] ✓ License is VALID`);
    console.log(`[Agent] Owner: ${result.license.owner_email}`);
    console.log(`[Agent] Product ID: ${result.license.product_id}`);
    console.log(`[Agent] Created: ${result.license.created_at}`);
    return { valid: true, license: result.license };
  } else {
    console.log(`[Agent] ✗ License is INVALID`);
    return { valid: false };
  }
}

const key = process.argv[2];
if (!key) {
  console.error("Usage: node 02-agent-license-verify.js <license-key>");
  process.exit(1);
}

agentWorkflow(key);
