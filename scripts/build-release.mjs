#!/usr/bin/env node
import { existsSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

function fail(message) {
  console.error(message);
  process.exit(1);
}

function applyEnvFile(filename) {
  const filePath = join(process.cwd(), filename);
  if (!existsSync(filePath)) {
    return;
  }

  const lines = readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const idx = trimmed.indexOf("=");
    if (idx === -1) {
      continue;
    }

    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

applyEnvFile(".env");
applyEnvFile(".env.local");

const required = ["NEXT_PUBLIC_API_BASE_URL"];
const missing = required.filter((key) => !process.env[key]?.trim());
if (missing.length > 0) {
  fail(`Missing required environment variables: ${missing.join(", ")}`);
}

const nextDir = join(process.cwd(), ".next");
try {
  rmSync(nextDir, { recursive: true, force: true, maxRetries: 2, retryDelay: 200 });
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  fail(
    `Cannot clean .next before release build. Stop all dev/build processes and retry. Details: ${message}`,
  );
}

const command = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const result = spawnSync(command, ["build"], {
  cwd: process.cwd(),
  stdio: "inherit",
  shell: false,
  env: process.env,
});

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}
