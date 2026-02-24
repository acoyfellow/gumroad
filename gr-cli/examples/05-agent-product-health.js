#!/usr/bin/env node
/**
 * Example 5: AI Agent product health check
 *
 * Use case: An AI DevOps agent that monitors product health,
 * checking if products are published, their prices, and basic info.
 * Useful for automated health dashboards.
 *
 * Run: node examples/05-agent-product-health.js
 */

const CONFIG_PATH = process.env.HOME + "/.gr-config.json";

async function getProducts() {
  const fs = await import("fs/promises");
  const config = JSON.parse(await fs.readFile(CONFIG_PATH, "utf-8"));

  const res = await fetch("https://api.gumroad.com/v2/products", {
    headers: { Authorization: `Bearer ${config.token}` },
  });
  return res.json();
}

async function getSales() {
  const fs = await import("fs/promises");
  const config = JSON.parse(await fs.readFile(CONFIG_PATH, "utf-8"));

  const res = await fetch("https://api.gumroad.com/v2/sales", {
    headers: { Authorization: `Bearer ${config.token}` },
  });
  return res.json();
}

// Agent workflow: "Generate product health report"
async function agentProductHealthReport() {
  console.log("[Agent] Generating product health report...\n");

  const [productsData, salesData] = await Promise.all([getProducts(), getSales()]);

  const products = productsData.products || [];
  const sales = salesData.sales || [];

  console.log("=".repeat(50));
  console.log("PRODUCT HEALTH REPORT");
  console.log("=".repeat(50));
  console.log(`\nTotal Products: ${products.length}`);
  console.log(`Total Sales: ${sales.length}`);

  const published = products.filter((p) => p.published);
  const draft = products.filter((p) => !p.published);

  console.log(`\nPublished: ${published.length}`);
  console.log(`Draft: ${draft.length}`);

  if (products.length > 0) {
    console.log("\n--- Product Details ---\n");

    for (const p of products.slice(0, 5)) {
      const productSales = sales.filter((s) => s.product_id === p.id).length;
      console.log(`[${p.published ? "✓" : "✗"}] ${p.name}`);
      console.log(`    Price: ${p.currency} ${p.price}`);
      console.log(`    Sales: ${productSales}`);
      console.log(`    URL: ${p.url}`);
      console.log("");
    }
  }

  console.log("=".repeat(50));
  console.log("[Agent] Report complete");
}

agentProductHealthReport();
