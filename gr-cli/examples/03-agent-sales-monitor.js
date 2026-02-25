#!/usr/bin/env node
/**
 * Example 3: AI Agent monitoring sales in real-time
 *
 * Use case: An AI analyst agent that periodically checks sales data
 * and can alert humans about important events (big sales, refunds, etc.)
 *
 * Run: node examples/03-agent-sales-monitor.js
 */

const CONFIG_PATH = process.env.HOME + "/.gr-config.json";

async function getSales(limit = 10) {
  const fs = await import("fs/promises");
  const config = JSON.parse(await fs.readFile(CONFIG_PATH, "utf-8"));

  const res = await fetch(`https://api.gumroad.com/v2/sales?limit=${limit}`, {
    headers: { Authorization: `Bearer ${config.token}` },
  });
  return res.json();
}

// Agent workflow: "Give me a sales summary"
async function agentSalesSummary() {
  console.log("[Agent] Fetching recent sales...\n");

  const { sales } = await getSales(5);

  if (!sales || sales.length === 0) {
    console.log("[Agent] No recent sales found");
    return;
  }

  const total = sales.reduce((sum, s) => sum + s.amount / 100, 0);

  console.log(`[Agent] Last ${sales.length} sales (Total: $${total.toFixed(2)}):\n`);

  for (const sale of sales) {
    const date = new Date(sale.created_at).toLocaleDateString();
    console.log(`  ${date} - $${(sale.amount / 100).toFixed(2)} - ${sale.buyer_email || "unknown"}`);
  }
}

agentSalesSummary();
