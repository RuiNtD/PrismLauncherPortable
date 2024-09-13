import { $ } from "bun";
import prettyBytes from "pretty-bytes";
import prompts from "prompts";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { tmpdir } from "node:os";

const dir = (
  await Promise.all(
    Array.from(await fs.readdir(".", { withFileTypes: true }))
      .filter((v) => v.isFile() && path.extname(v.name) == ".exe")
      .map(
        async ({ name }): Promise<[string, number]> => [
          name,
          (await fs.stat(name)).mtime.valueOf(),
        ]
      )
  )
)
  .sort((a, b) => b[1] - a[1])
  .map((v) => v[0]);

const { file }: { file: string } = await prompts({
  type: "select",
  name: "file",
  message: "Pick a file",
  choices: dir.map((v) => ({ title: v, value: v })),
});

function formatSize(size: number): string {
  return prettyBytes(size, {
    binary: true,
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })
    .replace(" ", "")
    .replace("i", "");
}

const downloadSize = formatSize((await fs.stat(file))?.size || 0);
const hasher = new Bun.CryptoHasher("md5");
hasher.update(await Bun.file(file).bytes());
const hash = hasher.digest("hex");

const tempDir = await fs.mkdtemp(path.join(tmpdir(), "prism-"));
for (const type of ["unload", "unhandledrejection"])
  globalThis.addEventListener(type, async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

await $`./${file} /DESTINATION=${tempDir}\\`;

let tempSize = 0;
for await (const file of await fs.readdir(tempDir, {
  withFileTypes: true,
  recursive: true,
})) {
  if (file.isDirectory()) continue;
  const stat = await fs.stat(path.join(file.parentPath, file.name));
  tempSize += stat.size;
}
const installedSize = formatSize(tempSize);

await fs.rm(tempDir, { recursive: true, force: true });

console.log(`[${downloadSize} download / ${installedSize} installed]
(MD5: ${hash})`);
