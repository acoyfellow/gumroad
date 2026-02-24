#!/usr/bin/env node
/**
 * Example 4: AI Agent checking subscription status
 *
 * Use case: An AI support agent that needs to check if a customer
 * has an active subscription before providing help.
 *
 * Run: node examples/04-agent-subscription-check.js <email>
 * Example: node examples/04-agent-subscription-check.js customer@example.com
 */

const CONFIG_PATH = process.env.HOME + "/.gr-config.json";

async function getSubscribers(productId = null) {
  const fs = await import("fs/promises");
  const config = JSON.parse(await fs.readFile(CONFIG_PATH, "utf-8"));

  const url = productId
    ? `https://api.gumroad.com/v2/subscribers?product_id=${productId}`
    : "https://api.gumroad.com/v2/subscribers";

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${config.token}` },
  });
  return res.json();
}

async function findSubscriber(email) {
  const { subscribers } = await getSubscribers();
  return subscribers?.find((s) => s.email.toLowerCase() === email.toLowerCase());
}

// Agent workflow: "Check if customer has active subscription"
async function agentWorkflow(customerEmail) {
  console.log(`[Agent] Looking up subscriber: ${customerEmail}`);

  const subscriber = await findSubscriber(customerEmail);

  if (subscriber) {
    console.log(`[Agent] ✓ Found subscriber`);
    console.log(`[Agent] Status: ${subscriber.status}`);
    console.log(`[Agent] Started: ${subscriber.started_at}`);
    console.log(`[Agent] Product ID: ${subscriber.product_id}`);
    return { found: true, subscriber };
  } else {
    console.log(`[Agent] ✗ No active subscription found for ${customerEmail}`);
    return { found: false };
  }
}

const email = process.argv[2];
if (!email) {
  console.error("Usage: node 04-agent-subscription-check.js <email>");
  process.exit(1);
}

agentWorkflow(email);
