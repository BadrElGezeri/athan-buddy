const path = require("node:path");
const fs = require("node:fs");
const os = require("node:os");
const { spawn } = require("node:child_process");

const playwrightPath = process.argv[2];
const executablePath = path.resolve(process.argv[3]);
const screenshotPath = path.resolve(process.argv[4] || "artifacts/screenshots/packaged-onboarding.png");
const { chromium } = require(playwrightPath);

fs.mkdirSync(path.dirname(screenshotPath), { recursive: true });

function waitForDevTools(process, timeoutMs = 45000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Packaged app did not expose its test debugging endpoint")), timeoutMs);
    let output = "";
    const inspect = (chunk) => {
      output += chunk.toString();
      const match = output.match(/DevTools listening on (ws:\/\/[^\s]+)/);
      if (match) {
        clearTimeout(timer);
        resolve(match[1]);
      }
    };
    process.stderr.on("data", inspect);
    process.stdout.on("data", inspect);
    process.once("exit", (code) => {
      clearTimeout(timer);
      reject(new Error(`Packaged app exited before smoke testing (code ${code})`));
    });
  });
}

async function waitForAppWindow(context, timeoutMs = 45000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const candidate = context.pages().find(
      (page) => page.url().startsWith("athan-buddy://app/") || page.url().startsWith("http://localhost:5173"),
    );
    if (candidate) return candidate;
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error(`No Athan Buddy renderer appeared. Targets: ${context.pages().map((page) => page.url()).join(", ")}`);
}

(async () => {
  const isolatedUserData = fs.mkdtempSync(path.join(os.tmpdir(), "athan-buddy-smoke-"));
  const application = spawn(executablePath, ["--remote-debugging-port=0", `--user-data-dir=${isolatedUserData}`], {
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
  let browser;
  try {
    const endpoint = await waitForDevTools(application);
    browser = await chromium.connectOverCDP(endpoint, { timeout: 45000 });
    const context = browser.contexts()[0];
    const window = await waitForAppWindow(context);
    await window.waitForLoadState("domcontentloaded");
    await window.locator("h1").first().waitFor({ timeout: 45000 });
    await window.screenshot({ path: screenshotPath });
    const result = {
      title: await window.title(),
      heading: await window.locator("h1").first().textContent(),
      bridge: await window.evaluate(() => typeof window.athanBuddy?.getState === "function" && typeof window.athanBuddy?.getAyahTimings === "function" && typeof window.athanBuddy?.checkForUpdates === "function" && typeof window.athanBuddy?.openUpdateRelease === "function"),
      screenshotPath,
    };
    console.log(JSON.stringify(result));
  } finally {
    if (browser) await browser.close().catch(() => undefined);
    if (!application.killed) application.kill();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
