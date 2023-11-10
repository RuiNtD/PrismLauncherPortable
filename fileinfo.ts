import $ from "dax";
import { format as formatBytes } from "std/fmt/bytes.ts";
import { crypto } from "std/crypto/mod.ts";
import { encodeHex } from "std/encoding/hex.ts";

$.setPrintCommand(true);

const dir = Array.from($.path(".").readDirFilePathsSync())
  .filter((v) => v.isFileSync() && v.extname() == ".exe")
  .map((v) => ({
    path: v,
    time: v.statSync()?.mtime?.valueOf() || 0,
  }))
  .sort((a, b) => b.time - a.time)
  .map((v) => v.path);

const file =
  dir[
    await $.select({
      message: "Pick a file",
      options: dir.map((v) => v.basename()),
    })
  ];

function formatSize(size: number): string {
  return formatBytes(size, {
    binary: true,
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })
    .replace(" ", "")
    .replace("i", "");
}

const downloadSize = formatSize((await file.stat())?.size || 0);
const hash = encodeHex(
  await crypto.subtle.digest("MD5", await file.readBytes())
);

const tempDir = $.path(await Deno.makeTempDir());
for (const type of ["unload", "unhandledrejection"])
  globalThis.addEventListener(type, () => {
    tempDir.removeSync({ recursive: true });
  });

await $`${file} /DESTINATION=${tempDir}\\`;

let tempSize = 0;
for await (const entry of tempDir.walk()) {
  if (entry.isDirectory) continue;
  const stat = await entry.path.stat();
  tempSize += stat?.size || 0;
}
const installedSize = formatSize(tempSize);

$.log(`[${downloadSize} download / ${installedSize} installed]
(MD5: ${hash})`);
