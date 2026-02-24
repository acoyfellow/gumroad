/**
 * Tests for gr CLI
 *
 * Following Gumroad's testing guidelines:
 * - Don't use "should" in test names
 * - Write descriptive test names that explain the behavior
 */

import { describe, it, expect } from "vitest";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

// Get project root relative to this test file
const PROJECT_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function runCli(args: string[]): { status: number; output: string } {
  const result = spawnSync("node", ["dist/index.js", ...args], {
    cwd: PROJECT_ROOT,
    encoding: "utf-8",
  });
  const output = Array.isArray(result.output) ? result.output.join("") : result.output || "";
  return {
    status: result.status || 0,
    output,
  };
}

describe("gr CLI error handling", () => {
  it("exits with error for unknown command", () => {
    const { status } = runCli(["unknown"]);
    expect(status).toBe(1);
  });

  it("exits with error when product id is missing for get", () => {
    const { status } = runCli(["products", "get"]);
    expect(status).toBe(1);
  });

  it("exits with error when product id is missing for enable", () => {
    const { status } = runCli(["products", "enable"]);
    expect(status).toBe(1);
  });

  it("exits with error when product id is missing for disable", () => {
    const { status } = runCli(["products", "disable"]);
    expect(status).toBe(1);
  });

  it("exits with error when sale id is missing for get", () => {
    const { status } = runCli(["sales", "get"]);
    expect(status).toBe(1);
  });

  it("exits with error when sale id is missing for refund", () => {
    const { status } = runCli(["sales", "refund"]);
    expect(status).toBe(1);
  });

  it("exits with error when product id and license key are missing for verify", () => {
    const { status } = runCli(["licenses", "verify"]);
    expect(status).toBe(1);
  });

  it("exits with error when license key is missing for enable", () => {
    const { status } = runCli(["licenses", "enable"]);
    expect(status).toBe(1);
  });

  it("exits with error when license key is missing for disable", () => {
    const { status } = runCli(["licenses", "disable"]);
    expect(status).toBe(1);
  });

  it("exits with error when subscriber id is missing for get", () => {
    const { status } = runCli(["subscribers", "get"]);
    expect(status).toBe(1);
  });

  it("exits with error when product id is missing for subscribers list", () => {
    const { status } = runCli(["subscribers", "list"]);
    expect(status).toBe(1);
  });
});

describe("gr CLI version", () => {
  it("shows version with --version flag", () => {
    const { output } = runCli(["--version"]);
    expect(output.trim()).toBe("gr v0.1.0");
  });

  it("shows version with -v flag", () => {
    const { output } = runCli(["-v"]);
    expect(output.trim()).toBe("gr v0.1.0");
  });
});

describe("gr CLI help", () => {
  it("shows help when no arguments provided", () => {
    const { output } = runCli([]);
    expect(output).toContain("gr - AI-native CLI for Gumroad");
    expect(output).toContain("auth login");
    expect(output).toContain("products list");
  });

  it("shows help with --help flag", () => {
    const { output } = runCli(["--help"]);
    expect(output).toContain("gr - AI-native CLI for Gumroad");
  });
});

describe("gr CLI commands documentation", () => {
  it("shows all product commands in help", () => {
    const { output } = runCli(["--help"]);
    expect(output).toContain("products enable");
    expect(output).toContain("products disable");
  });

  it("shows all sales commands in help", () => {
    const { output } = runCli(["--help"]);
    expect(output).toContain("sales refund");
  });

  it("shows all license commands in help", () => {
    const { output } = runCli(["--help"]);
    expect(output).toContain("licenses verify");
    expect(output).toContain("licenses enable");
    expect(output).toContain("licenses disable");
  });

  it("shows all subscriber commands in help", () => {
    const { output } = runCli(["--help"]);
    expect(output).toContain("subscribers list");
    expect(output).toContain("subscribers get");
  });
});
