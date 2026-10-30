const { spawn, spawnSync } = require("node:child_process");
const fs = require("node:fs");
const net = require("node:net");
const os = require("node:os");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "../..");
const SERVER_SCRIPT = path.join(__dirname, "browser-smoke-server.js");
const SMOKE_PATH = "/tests/storage/indexeddb-cutover-smoke.html";
const TIMEOUT_MS = 30000;

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      server.close(() => resolve(address.port));
    });
  });
}

function browserPath() {
  const candidates = [
    process.env.KREATORM_SMOKE_BROWSER,
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe"
  ].filter(Boolean);
  return candidates.find((candidate) => fs.existsSync(candidate)) || null;
}

function waitForServer(child, timeoutMs) {
  return new Promise((resolve, reject) => {
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      reject(new Error(`Smoke server readiness timed out. ${stderr}`));
    }, timeoutMs);
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
      if (stdout.includes("KREATORM_SMOKE_SERVER_READY")) {
        clearTimeout(timer);
        resolve();
      }
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.once("exit", (code) => {
      clearTimeout(timer);
      reject(new Error(`Smoke server exited early (${code}). ${stderr}`));
    });
  });
}

async function waitForPageTarget(debugPort, smokeUrl, deadline) {
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${debugPort}/json/list`);
      if (response.ok) {
        const targets = await response.json();
        const target = targets.find(
          (item) => item.type === "page" && item.url.startsWith(smokeUrl)
        );
        if (target?.webSocketDebuggerUrl) return target;
      }
    } catch (_) {
      // Edge is still starting.
    }
    await delay(100);
  }
  throw new Error("CDP page target did not become available.");
}

function createCdpClient(webSocketUrl) {
  const socket = new WebSocket(webSocketUrl);
  const pending = new Map();
  let nextId = 1;
  const opened = new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", () => reject(new Error("CDP WebSocket failed.")), {
      once: true
    });
  });
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(String(event.data));
    if (!message.id || !pending.has(message.id)) return;
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) reject(new Error(message.error.message));
    else resolve(message.result);
  });
  return {
    async send(method, params = {}) {
      await opened;
      const id = nextId++;
      const promise = new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });
      });
      socket.send(JSON.stringify({ id, method, params }));
      return promise;
    },
    close() {
      socket.close();
    }
  };
}

async function pollSmokeStatus(client, deadline) {
  while (Date.now() < deadline) {
    const response = await client.send("Runtime.evaluate", {
      expression: `({
        status: document.body?.dataset?.status || "missing",
        text: document.getElementById("result")?.textContent || ""
      })`,
      returnByValue: true
    });
    const value = response.result?.value || {};
    if (value.status === "ok") return value;
    if (value.status === "failed") {
      throw new Error(value.text || "Browser smoke reported failure.");
    }
    await delay(100);
  }
  throw new Error("Browser smoke did not reach a terminal state before timeout.");
}

function terminateProcessTree(child) {
  if (!child || child.exitCode !== null || !child.pid) return;
  if (process.platform === "win32") {
    spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], {
      stdio: "ignore",
      windowsHide: true
    });
  } else {
    child.kill("SIGKILL");
  }
}

async function main() {
  const executable = browserPath();
  if (!executable) {
    process.stdout.write("INDEXEDDB_CUTOVER_BROWSER_NOT_AVAILABLE\n");
    process.exitCode = 2;
    return;
  }

  const [serverPort, debugPort] = await Promise.all([freePort(), freePort()]);
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "kreatorm-cdp-smoke-"));
  const smokeUrl = `http://127.0.0.1:${serverPort}${SMOKE_PATH}`;
  const deadline = Date.now() + TIMEOUT_MS;
  let server = null;
  let browser = null;
  let client = null;
  let shuttingDown = false;

  try {
    server = spawn(process.execPath, [SERVER_SCRIPT], {
      cwd: ROOT,
      env: { ...process.env, KREATORM_SMOKE_PORT: String(serverPort) },
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true
    });
    await waitForServer(server, 10000);

    browser = spawn(executable, [
      "--headless=new",
      "--disable-gpu",
      "--no-first-run",
      "--disable-background-networking",
      "--log-level=3",
      `--user-data-dir=${profile}`,
      `--remote-debugging-port=${debugPort}`,
      "--remote-debugging-address=127.0.0.1",
      smokeUrl
    ], {
      stdio: ["ignore", "ignore", "pipe"],
      windowsHide: true
    });

    let browserErrors = "";
    browser.stderr.on("data", (chunk) => {
      browserErrors += chunk;
    });
    browser.once("exit", (code) => {
      if (!shuttingDown && Date.now() < deadline && code !== null && code !== 0) {
        process.stderr.write(`Headless browser exited early (${code}). ${browserErrors}\n`);
      }
    });

    const target = await waitForPageTarget(debugPort, smokeUrl, deadline);
    client = createCdpClient(target.webSocketDebuggerUrl);
    await client.send("Runtime.enable");
    const status = await pollSmokeStatus(client, deadline);
    process.stdout.write(`${status.text}\n`);
  } finally {
    shuttingDown = true;
    client?.close();
    terminateProcessTree(browser);
    terminateProcessTree(server);
    const resolvedProfile = path.resolve(profile);
    const resolvedTemp = path.resolve(os.tmpdir());
    if (
      resolvedProfile.startsWith(`${resolvedTemp}${path.sep}`) &&
      path.basename(resolvedProfile).startsWith("kreatorm-cdp-smoke-")
    ) {
      fs.rmSync(resolvedProfile, { recursive: true, force: true });
    }
  }
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exitCode = 1;
});
