import { z } from "zod";

import { join } from "std/path/mod.ts";
import { ensureDir } from "std/fs/mod.ts";
import { grantOrThrow } from "std/permissions/mod.ts";

import ini from "ini";
import { ZipReader, HttpReader, Uint8ArrayWriter } from "zipjs";

const GitHubTag = z.object({
  name: z.string(),
});
const GitHubTags = GitHubTag.array();

const AppInfoIni = z.object({
  Version: z.object({
    PackageVersion: z.string(),
    DisplayVersion: z.string(),
  }),
});
type AppInfoIni = z.infer<typeof AppInfoIni>;

const latestVersion = GitHubTags.parse(
  await (
    await fetch("https://api.github.com/repos/PrismLauncher/PrismLauncher/tags")
  ).json()
)[0].name;

const appPath = join("PrismLauncherPortable", "App");
await grantOrThrow(
  { name: "read", path: appPath },
  { name: "write", path: appPath }
);

const iniPath = join(appPath, "AppInfo", "appinfo.ini");
const appinfo = <AppInfoIni>ini.parse(await Deno.readTextFile(iniPath));
AppInfoIni.parse(appinfo);

const versionArray = appinfo.Version.PackageVersion.split(".");
const currentVersion = versionArray.slice(0, 2).join(".");
const updateAvailable = currentVersion != latestVersion;

const updateNum = updateAvailable ? 0 : parseInt(versionArray[2]) + 1;
appinfo.Version.DisplayVersion = `${latestVersion} Update ${updateNum}`;
appinfo.Version.PackageVersion = `${latestVersion}.${updateNum}.0`;
console.log(
  `New version: ${appinfo.Version.DisplayVersion} (${appinfo.Version.PackageVersion})`
);

if (confirm("Update appinfo.ini?")) {
  await Deno.writeTextFile(iniPath, ini.stringify(appinfo));
  console.log("Updated appinfo.ini");
}
console.log();

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

const gitignore = `
*
!.gitignore
`.trimStart();

if (updateAvailable || confirm("Redownload Prism Launcher?")) {
  for await (const entry of Deno.readDir(appPath)) {
    if (!entry.isDirectory) continue;
    if (entry.name == "AppInfo") continue;

    const path = join(appPath, entry.name);
    await Deno.remove(path, { recursive: true });
  }

  for (const download of downloads) {
    const path = join(appPath, download.dir);
    const url = `${urlBase}/${download.filename}`;

    const zipReader = new ZipReader(new HttpReader(url));
    const entries = await zipReader.getEntries();

    console.log("Downloaded", download.filename);
    await ensureDir(path);
    await Deno.writeTextFile(join(path, ".gitignore"), gitignore);

    for (const entry of entries) {
      if (!entry.getData) continue;
      if (entry.filename == "prismlauncher_updater.exe") continue;

      const uint8 = await entry.getData(new Uint8ArrayWriter());
      const filePath = join(path, entry.filename);

      if (entry.directory) await Deno.mkdir(filePath);
      else await Deno.writeFile(filePath, uint8);
    }
  }
}
console.log();

if (updateAvailable || confirm("Create launcher and installer?")) {
  const p = new Deno.Command("./make.bat");
  await p.output();
}
console.log();

console.log(
  `- ${
    updateAvailable ? "Update to" : "Still using"
  } [Prism Launcher ${latestVersion}](https://github.com/PrismLauncher/PrismLauncher/releases/tag/${latestVersion})`
);
alert("Done!");
