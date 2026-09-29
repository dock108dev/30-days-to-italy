import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

const { values } = parseArgs({
  options: {
    hostname: { type: "string", default: "127.0.0.1" },
    port: { type: "string", default: "3000" },
  },
});
const port = Number(values.port);
if (!Number.isInteger(port) || port < 0 || port > 65535) {
  throw new Error("--port must be an integer between 0 and 65535");
}

process.env.WRANGLER_LOG_PATH ??= ".wrangler/wrangler.log";
const { unstable_dev } = await import("wrangler");

// Serve the production artifact in workerd, which understands cloudflare:
// imports. Keep local acceptance runs isolated from persisted or remote state.
const workerPromise = unstable_dev(
  fileURLToPath(new URL("../dist/server/index.js", import.meta.url)),
  {
    config: fileURLToPath(new URL("../dist/server/wrangler.json", import.meta.url)),
    ip: values.hostname,
    port,
    local: true,
    bundle: false,
    persist: false,
    inspect: false,
    experimental: {
      disableExperimentalWarning: true,
      disableDevRegistry: true,
      watch: false,
    },
  },
);

let stopping = false;
async function stop() {
  if (stopping) return;
  stopping = true;
  try {
    await (await workerPromise).stop();
    process.exitCode = 0;
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  }
}
process.once("SIGTERM", stop);
process.once("SIGINT", stop);
await workerPromise;
