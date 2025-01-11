import $ from "@david/dax";
import { format as formatBytes } from "@std/fmt/bytes";
import { crypto } from "@std/crypto";
import { encodeHex } from "@std/encoding/hex";
import { walk } from "@std/fs";

const dir = (
  await Promise.all(
    Array.from($.path(".").readDirFilePathsSync())
      .filter((v) => v.isFileSync() && v.extname() == ".exe")
      .map(async (v) => ({
        path: v,
        time: (await v.stat())?.mtime?.valueOf() || 0,
      }))
  )
)
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

const tempDir = $.path(await Deno.makeTempDir({ prefix: "prism-" }));
for (const type of ["unload", "unhandledrejection"])
  globalThis.addEventListener(type, () => {
    tempDir.ensureRemoveSync({ recursive: true });
  });

await $`${file} /DESTINATION=${tempDir}\\`;

let tempSize = 0;
for await (const file of walk(tempDir.toString())) {
  if (file.isDirectory) continue;
  const path = $.path(file.path);
  const stat = await path.stat();
  tempSize += stat?.size || 0;
}
const installedSize = formatSize(tempSize);

await tempDir.ensureRemove({ recursive: true });

$.log(`[${downloadSize} download / ${installedSize} installed]
(MD5: ${hash})`);
