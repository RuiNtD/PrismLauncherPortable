import $ from "@david/dax";
import { ZipReader, Uint8ArrayWriter, BlobReader } from "@zip-js/zip-js";
import { appPath } from "./const.ts";
import { readAppInfo } from "./appinfo.ts";
import { getLatestPrism, GHRelease } from "./prism.ts";
import { assert } from "@std/assert";

interface Download {
  dir: string;
  file: RegExp;
}

async function cleanPrism() {
  for await (const file of appPath.readDir()) {
    if (!file.isDirectory) continue;
    if (file.name == "AppInfo") continue;
    if (file.name == "DefaultData") continue;

    await file.path.remove({ recursive: true });
  }
}

async function downloadPrism(dir: string, url: string) {
  const path = appPath.join(dir);

  await path.ensureRemove();
  await path.mkdir({ recursive: true });

  // const { body: resp } = await fetch(url);
  const resp = await $.request(url).showProgress().blob();
  if (!resp) throw new Error(`Failed to download ${url}`);

  await $.progress("Unzipping...").with(async () => {
    const zipReader = new ZipReader(new BlobReader(resp));
    const entries = await zipReader.getEntries();
    for (const entry of entries) {
      if (!entry.getData) continue;
      if (entry.filename == "prismlauncher_updater.exe") continue;

      const uint8 = await entry.getData(new Uint8ArrayWriter());
      const filePath = path.join(entry.filename);

      if (entry.directory) await filePath.mkdir();
      else await filePath.write(uint8);
    }
  });
}

export async function redownloadPrism(release: GHRelease) {
  await cleanPrism();

  const downloads: Download[] = [
    {
      dir: "PrismLauncher",
      file: /Windows-MinGW-w64-Portable/,
    },
    {
      dir: "PrismLauncherARM64",
      file: /Windows-MinGW-arm64-Portable/,
    },
  ];

  for (const download of downloads) {
    const asset = release.assets.find((asset) =>
      download.file.test(asset.name),
    );
    assert(asset);
    await downloadPrism(download.dir, asset.browser_download_url);
  }
}

export async function buildLauncher() {
  const dir = $.path("./PrismLauncherPortable").resolve();
  await $.progress("Building launcher...").with(async () => {
    await $`./PortableApps.comLauncher/PortableApps.comLauncherGenerator.exe ${dir}`;
  });
}

export async function buildInstaller() {
  const dir = $.path("./PrismLauncherPortable").resolve();
  await $.progress("Building installer...").with(async () => {
    await $`./PortableApps.comInstaller/PortableApps.comInstaller.exe ${dir}`;
  });
}

if (import.meta.main) {
  const appinfo = await readAppInfo();
  const verParts = appinfo.Version.PackageVersion.split(".");
  const version = verParts.slice(0, 3).join(".");

  $.logStep(`Downloading Prism Launcher ${version}...`);
  const release = await getLatestPrism();
  await redownloadPrism(release);

  await buildLauncher();
  await buildInstaller();
}
