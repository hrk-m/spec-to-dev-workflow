/**
 * sample-front のスクリーンショットを撮るスクリプト
 *
 * 使い方:
 *   bun run screenshot  （リポジトリルートから実行）
 *
 * 出力先: specs/img/*.png  （リポジトリルート基準）
 *
 * シナリオ定義: specs/{機能名}/*.md の `## スクリーンショット設定` JSON ブロックを自動解析する。
 *
 * シナリオ設定例:
 * ```json
 * {
 *   "steps": [
 *     { "goto": "http://localhost:3000" },
 *     { "waitForText": "hello" },
 *     { "screenshot": "hello" }
 *   ]
 * }
 * ```
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { chromium, type Page } from "playwright";
import type { ChildProcess } from "child_process";
import { spawn } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "../../../../../..");
const specDir = path.resolve(projectRoot, "specs");
const outputDir = path.resolve(projectRoot, "specs/img");

const FRONT_PORT = Number(process.env.FRONT_PORT ?? 3000);
const API_PORT = Number(process.env.API_PORT ?? 8080);
const FRONT_URL = `http://localhost:${FRONT_PORT}`;

// ── 型定義 ───────────────────────────────────────────────────

type Step =
  | { goto: string }
  | { click: { role: string; name: string }; screenshot?: string }
  | { fill: { role: string; name: string; value: string }; screenshot?: string }
  | { waitForText: string }
  | { screenshot: string };

interface ScenarioConfig {
  steps: Step[];
}

// ── spec パーサー ─────────────────────────────────────────────

function extractConfig(markdown: string): ScenarioConfig | null {
  const match = markdown.match(
    /##\s*スクリーンショット設定[\s\S]*?```json\s*\n([\s\S]*?)\n```/,
  );
  if (!match) return null;
  try {
    return JSON.parse(match[1]) as ScenarioConfig;
  } catch (e) {
    console.warn("JSON パースエラー:", e);
    return null;
  }
}

function loadScenarios(): Array<{ specName: string; config: ScenarioConfig }> {
  if (!fs.existsSync(specDir)) return [];
  const results: Array<{ specName: string; config: ScenarioConfig }> = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.name.endsWith(".md")) {
        const content = fs.readFileSync(fullPath, "utf-8");
        const config = extractConfig(content);
        if (config) {
          results.push({ specName: path.basename(entry.name, ".md"), config });
        }
      }
    }
  };
  walk(specDir);
  return results;
}

// ── サーバー管理 ──────────────────────────────────────────────

async function isReachable(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(1000) });
    return res.ok || res.status < 500;
  } catch {
    return false;
  }
}

async function waitReachable(url: string, timeoutMs = 15000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await isReachable(url)) return;
    await Bun.sleep(500);
  }
  throw new Error(`タイムアウト: ${url} に接続できません`);
}

function startProcess(cmd: string, args: string[], cwd: string): ChildProcess {
  return spawn(cmd, args, { cwd, stdio: "pipe", detached: false });
}

// ── シナリオ実行 ──────────────────────────────────────────────

async function runScenario(config: ScenarioConfig, page: Page): Promise<void> {
  for (const step of config.steps) {
    if ("goto" in step) {
      await page.goto(step.goto, { waitUntil: "networkidle", timeout: 15000 });
      await page.waitForTimeout(500);
    } else if ("waitForText" in step) {
      await page.waitForSelector(`text=${step.waitForText}`, { timeout: 10000 });
    } else if ("click" in step) {
      await page
        .getByRole(step.click.role as Parameters<Page["getByRole"]>[0], { name: step.click.name })
        .click();
      await page.waitForTimeout(300);
      if (step.screenshot) await capture(page, step.screenshot);
    } else if ("fill" in step) {
      await page.getByRole("textbox", { name: step.fill.name }).fill(step.fill.value);
      await page.waitForTimeout(300);
      if (step.screenshot) await capture(page, step.screenshot);
    } else if ("screenshot" in step) {
      await capture(page, step.screenshot);
    }
  }
}

async function capture(page: Page, name: string): Promise<void> {
  const filePath = path.join(outputDir, `${name}.png`);
  await page.screenshot({ path: filePath, fullPage: true });
  console.log(`  → ${filePath}`);
}

// ── メイン ────────────────────────────────────────────────────

const scenarios = loadScenarios();

if (scenarios.length === 0) {
  console.log(
    "スクリーンショット設定が見つかりません。\n" +
      "specs/{機能名}/*.md に ## スクリーンショット設定 セクション（JSON）を追加してください。",
  );
  process.exit(0);
}

console.log(`${scenarios.length} シナリオを検出:`, scenarios.map((s) => s.specName).join(", "));

fs.mkdirSync(outputDir, { recursive: true });

// サーバー起動（未起動の場合のみ）
const apiRunning = await isReachable(`http://localhost:${API_PORT}/hello`);
const frontRunning = await isReachable(FRONT_URL);

let apiProc: ChildProcess | null = null;
let frontProc: ChildProcess | null = null;

if (!apiRunning) {
  console.log("sample-api を起動中...");
  apiProc = startProcess("go", ["run", "main.go"], path.resolve(projectRoot, "sample-api"));
  await waitReachable(`http://localhost:${API_PORT}/hello`);
  console.log(`sample-api 起動完了 (:${API_PORT})`);
}

if (!frontRunning) {
  console.log("sample-front を起動中...");
  frontProc = startProcess("bun", ["run", "dev"], path.resolve(projectRoot, "sample-front"));
  await waitReachable(FRONT_URL);
  console.log(`sample-front 起動完了 (:${FRONT_PORT})`);
}

// Playwright でスクリーンショット撮影
const browser = await chromium.launch({ headless: true });

try {
  for (const { specName, config } of scenarios) {
    console.log(`\n[${specName}]`);
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1280, height: 800 });
    await runScenario(config, page);
    await page.close();
  }
} finally {
  await browser.close();
  apiProc?.kill();
  frontProc?.kill();
}

console.log("\n完了");
