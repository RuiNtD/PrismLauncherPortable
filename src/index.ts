import { $ } from "bun";
import z from "zod";
import * as ini from "ini";
import { ZipReader, Uint8ArrayWriter } from "@zip.js/zip.js";
import { getLatestPrism } from "./prism.ts";
import * as fs from "node:fs/promises";
import path, { join } from "node:path";
import chalk from "chalk";

const AppInfoIni = z.object({
  Version: z.object({
    PackageVersion: z.string(),
    DisplayVersion: z.string(),
  }),
});
type AppInfoIni = z.infer<typeof AppInfoIni>;

const latestVersion = (await getLatestPrism()).tag_name;

const appPath = join("PrismLauncherPortable", "App");
const iniPath = join(appPath, "AppInfo", "appinfo.ini");
const appinfo = <AppInfoIni>ini.parse(await Bun.file(iniPath).text());
AppInfoIni.parse(appinfo);

const versionArray = appinfo.Version.PackageVersion.split(".");
const currentVersion = versionArray.slice(0, 2).join(".");
const updateAvailable = currentVersion != latestVersion;

console.log(
  chalk.gray(
    `Old version: ${appinfo.Version.DisplayVersion} (${appinfo.Version.PackageVersion})`
  )
);
const updateNum = updateAvailable ? 0 : parseInt(versionArray[2]) + 1;
appinfo.Version.DisplayVersion = latestVersion;
if (updateNum > 0) appinfo.Version.DisplayVersion += ` Update ${updateNum}`;
appinfo.Version.PackageVersion = `${latestVersion}.${updateNum}.0`;
console.log(
  `New version: ${appinfo.Version.DisplayVersion} (${appinfo.Version.PackageVersion})`
);

if (confirm("Update appinfo.ini?")) {
  Bun.write(iniPath, ini.stringify(appinfo));
  console.log(chalk.green("Updated appinfo.ini"));
}

type Download = {
  dir: string;
  filename: string;
};

const urlBase = `https://github.com/PrismLauncher/PrismLauncher/releases/download/${latestVersion}`;
const downloads: Download[] = [
  {
    dir: "PrismLauncher",
    filename: `PrismLauncher-Windows-MSVC-${latestVersion}.zip`,
  },
  {
    dir: "PrismLauncherARM64",
    filename: `PrismLauncher-Windows-MSVC-arm64-${latestVersion}.zip`,
  },
];

if (updateAvailable || confirm("Redownload Prism Launcher?")) {
  for (const file of await fs.readdir(appPath, { withFileTypes: true })) {
    if (!file.isDirectory()) continue;
    if (file.name == "AppInfo") continue;
    await fs.rm(join(file.parentPath, file.name), {
      recursive: true,
      force: true,
    });
  }

  for (const download of downloads) {
    const path = join(appPath, download.dir);
    const url = `${urlBase}/${download.filename}`;
    await fs.mkdir(path, { recursive: true });

    const { body: resp } = await fetch(url);
    if (!resp) throw new Error(`Failed to download ${url}`);
    const zipReader = new ZipReader(resp);
    const entries = await zipReader.getEntries();

    for (const entry of entries) {
      if (!entry.getData) continue;
      if (entry.filename == "prismlauncher_updater.exe") continue;

      const uint8 = await entry.getData(new Uint8ArrayWriter());
      const filePath = join(path, entry.filename);

      if (entry.directory) await fs.mkdir(filePath);
      else await Bun.write(filePath, uint8);
    }
  }
}

if (updateAvailable || confirm("Create launcher and installer?")) {
  const dir = path.resolve("./PrismLauncherPortable");
  console.log(chalk.green("Creating launcher"));
  await $`./PortableApps.comLauncher/PortableApps.comLauncherGenerator.exe ${dir}`;
  console.log(chalk.green("Creating installer"));
  await $`./PortableApps.comInstaller/PortableApps.comInstaller.exe ${dir}`;
}

console.log();
console.log(
  `- Using [Prism Launcher ${latestVersion}](https://prismlauncher.org/news/release-${latestVersion})`
);
console.log();

alert("Done!");
