import { z } from "zod";

import { join } from "std/path/mod.ts";
import { emptyDir } from "std/fs/mod.ts";

import * as ini from "ini";
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
const iniPath = join(appPath, "AppInfo", "appinfo.ini");
const appinfo = <AppInfoIni>ini.parse(await Deno.readTextFile(iniPath));
AppInfoIni.parse(appinfo);

const standardVersion = latestVersion
  .split(".")
  .concat("0")
  .slice(0, 3)
  .join(".");
const updateAvailable = appinfo.Version.DisplayVersion != latestVersion;
const patchNum = updateAvailable
  ? 0
  : parseInt(
      (appinfo.Version.PackageVersion as string).split(".").pop() as string
    ) + 1;
appinfo.Version.DisplayVersion = latestVersion;
appinfo.Version.PackageVersion = `${standardVersion}.${patchNum}`;
console.log("New version:", appinfo.Version.PackageVersion);

if (updateAvailable || confirm("Update appinfo.ini?")) {
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
    dir: "PrismLauncher-Legacy",
    filename: `PrismLauncher-Windows-MSVC-Legacy-${latestVersion}.zip`,
  },
  {
    dir: "PrismLauncher-ARM64",
    filename: `PrismLauncher-Windows-MSVC-arm64-${latestVersion}.zip`,
  },
];

const gitignore = `
*
!.gitignore
`.trimStart();

if (updateAvailable || confirm("Redownload Prism Launcher?")) {
  for (const download of downloads) {
    const path = join(appPath, download.dir);
    const url = `${urlBase}/${download.filename}`;

    console.log("Downloading", download.filename);
    const zipReader = new ZipReader(new HttpReader(url));
    const entries = await zipReader.getEntries();

    await emptyDir(path);
    await Deno.writeTextFile(join(path, ".gitignore"), gitignore);

    for (const entry of entries) {
      if (!entry.getData) continue;
      const uint8 = await entry.getData(new Uint8ArrayWriter());
      const filePath = join(path, entry.filename);

      if (entry.directory) await Deno.mkdir(filePath);
      else await Deno.writeFile(filePath, uint8);
    }
  }
}
console.log();

if (updateAvailable || confirm("Create launcher and installer?")) {
  const p = Deno.run({
    cmd: ["./make.bat"],
  });
  await p.status();
}
console.log();

console.log(
  `- ${
    updateAvailable ? "Update to" : "Still using"
  } [Prism Launcher ${latestVersion}](https://github.com/PrismLauncher/PrismLauncher/releases/tag/${latestVersion})`
);
alert("Done!");
