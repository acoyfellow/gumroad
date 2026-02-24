#!/usr/bin/env node
/**
 * Example 1: AI Agent checking user context
 *
 * Use case: An AI coding assistant (Claude Code, Cursor, Roo) that needs
 * to know who the developer is when working on their Gumroad integration.
 *
 * This is how the agent discovers the authenticated user context.
 *
 * Run: node examples/01-agent-user-context.js
 */

const CONFIG_PATH = process.env.HOME + "/.gr-config.json";

async function getUser() {
  const fs = await import("fs/promises");
  const config = JSON.parse(await fs.readFile(CONFIG_PATH, "utf-8"));

  const res = await fetch("https://api.gumroad.com/v2/user", {
    headers: { Authorization: `Bearer ${config.token}` },
  });
  return res.json();
}

// Agent workflow: "I need to understand who I'm helping"
async function agentWorkflow() {
  console.log("[Agent] Discovering user context...");

  const { user } = await getUser();

  console.log(`[Agent] Working with: ${user.name} (${user.email})`);
  console.log(`[Agent] Store URL: ${user.url}`);

  // Now agent can personalize its responses
  return {
    name: user.name,
    email: user.email,
    storeUrl: user.url,
  };
}

agentWorkflow();
