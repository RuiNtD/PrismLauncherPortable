import * as path from "https://deno.land/std@0.196.0/path/mod.ts";
import { walk } from "https://deno.land/std@0.196.0/fs/mod.ts";
import { Select } from "https://deno.land/x/cliffy@v1.0.0-rc.2/prompt/select.ts";
import { format as formatBytes } from "https://deno.land/std@0.196.0/fmt/bytes.ts";
import { crypto, toHashString } from "https://deno.land/std/crypto/mod.ts";
import { stripTrailingSeparators } from "https://deno.land/std@0.196.0/path/_util.ts";

let dir = Array.from(Deno.readDirSync("."))
  .filter((v) => v.isFile && path.extname(v.name) == ".exe")
  .map((v) => ({
    name: v.name,
    time: Deno.statSync(v.name).mtime?.valueOf() || 0,
  }))
  .sort((a, b) => b.time - a.time)
  .map((v) => v.name);
const file: string = await Select.prompt({
  message: "Pick a file",
  options: dir,
});

function formatSize(size: number): string {
  return formatBytes(size, {
    binary: true,
  })
    .replace(" ", "")
    .replace("i", "");
}

const downloadSize = formatSize((await Deno.stat(file)).size);
const hash = toHashString(
  await crypto.subtle.digest("MD5", await Deno.readFile(file))
);

const tempDir = await Deno.makeTempDir();
await new Deno.Command(".\\" + file, {
  args: [`/DESTINATION=${tempDir}\\`],
}).output();

let tempSize = 0;
for await (const entry of walk(tempDir)) {
  if (entry.isDirectory) continue;
  const stat = await Deno.stat(entry.path);
  tempSize += stat.size;
}
const installedSize = formatSize(tempSize);
await Deno.remove(tempDir, { recursive: true });

console.log(`
[${downloadSize} download / ${installedSize} installed]
(MD5: ${hash})
`);
