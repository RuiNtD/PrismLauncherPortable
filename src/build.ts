import $ from "@david/dax";
import { ZipReader, Uint8ArrayWriter, BlobReader } from "@zip-js/zip-js";
import { appPath, repo } from "./const.ts";
import { readAppInfo } from "./appinfo.ts";

interface Download {
  dir: string;
  url: string;
}

async function cleanPrism() {
  for await (const file of appPath.readDir()) {
    if (!file.isDirectory) continue;
    if (file.name == "AppInfo") continue;
    if (file.name == "DefaultData") continue;

    await file.path.remove({ recursive: true });
  }
}

async function downloadPrism(download: Download) {
  const path = appPath.join(download.dir);
  const { url } = download;

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

export async function redownloadPrism(version: string) {
  await cleanPrism();

  const urlBase = `https://github.com/${repo}/releases/download/${version}`;
  const downloads: Download[] = [
    {
      dir: "PrismLauncher",
      url: `${urlBase}/PrismLauncher-Windows-MinGW-w64-Portable-${version}.zip`,
    },
    {
      dir: "PrismLauncherARM64",
      url: `${urlBase}/PrismLauncher-Windows-MinGW-arm64-Portable-${version}.zip`,
    },
  ];

  for (const download of downloads) await downloadPrism(download);
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
  await redownloadPrism(version);

  await buildLauncher();
  await buildInstaller();
}
