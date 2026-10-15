import { build } from "esbuild";
import { mkdir } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
const output = fileURLToPath(new URL("../../../generated-artifacts/invoices.test.cjs", import.meta.url));
await mkdir(fileURLToPath(new URL("../../../generated-artifacts/", import.meta.url)), { recursive: true });
await build({
  entryPoints: [fileURLToPath(new URL("../tests/invoices.test.ts", import.meta.url))],
  outfile: output, platform: "node", format: "cjs", bundle: true, external: ["pg-native", "*.node"],
});
const result = spawnSync(process.execPath, ["--test", output], { stdio: "inherit" });
process.exit(result.status ?? 1);
