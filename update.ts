import { z } from "zod";
import $ from "dax";
import { grantOrThrow } from "permissions";
import ini from "ini";
import { ZipReader, HttpReader, Uint8ArrayWriter } from "zipjs";

$.setPrintCommand(true);

const GitHubRelease = z.object({
  tag_name: z.string(),
});

const AppInfoIni = z.object({
  Version: z.object({
    PackageVersion: z.string(),
    DisplayVersion: z.string(),
  }),
});
type AppInfoIni = z.infer<typeof AppInfoIni>;

const latestVersion = GitHubRelease.parse(
  await $.request(
    "https://api.github.com/repos/PrismLauncher/PrismLauncher/releases/latest"
  ).json()
).tag_name;

const appPath = $.path("PrismLauncherPortable").join("App");
await grantOrThrow(
  { name: "read", path: appPath.toString() },
  { name: "write", path: appPath.toString() }
);

const iniPath = appPath.join("AppInfo", "appinfo.ini");
const appinfo = <AppInfoIni>ini.parse(await iniPath.readText());
AppInfoIni.parse(appinfo);

const versionArray = appinfo.Version.PackageVersion.split(".");
const currentVersion = versionArray.slice(0, 2).join(".");
const updateAvailable = currentVersion != latestVersion;

$.log(
  `Old version: ${appinfo.Version.DisplayVersion} (${appinfo.Version.PackageVersion})`
);
const updateNum = updateAvailable ? 0 : parseInt(versionArray[2]) + 1;
appinfo.Version.DisplayVersion = `${latestVersion} Update ${updateNum}`;
appinfo.Version.PackageVersion = `${latestVersion}.${updateNum}.0`;
$.log(
  `New version: ${appinfo.Version.DisplayVersion} (${appinfo.Version.PackageVersion})`
);

if (await $.confirm("Update appinfo.ini?")) {
  await iniPath.writeText(ini.stringify(appinfo));
  $.logStep("Updated appinfo.ini");
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

const gitignore = `
*
!.gitignore
`.trimStart();

if (updateAvailable || (await $.confirm("Redownload Prism Launcher?"))) {
  $.logLight("Downloading...");

  for await (const entry of appPath.readDir()) {
    if (!entry.isDirectory) continue;
    if (entry.name == "AppInfo") continue;

    const path = appPath.join(entry.name);
    await path.remove({ recursive: true });
  }

  for (const download of downloads) {
    const path = appPath.join(download.dir);
    const url = `${urlBase}/${download.filename}`;

    const zipReader = new ZipReader(new HttpReader(url));
    const entries = await zipReader.getEntries();

    $.logStep("Downloaded", download.filename);
    await path.ensureDir();
    await path.join(".gitignore").writeText(gitignore);

    for (const entry of entries) {
      if (!entry.getData) continue;
      if (entry.filename == "prismlauncher_updater.exe") continue;

      const uint8 = await entry.getData(new Uint8ArrayWriter());
      const filePath = path.join(entry.filename);

      if (entry.directory) await filePath.mkdir();
      else await filePath.write(uint8);
    }
  }
}

if (updateAvailable || (await $.confirm("Create launcher and installer?"))) {
  $.logStep("Creating launcher");
  await $`PortableApps.comLauncher/PortableApps.comLauncherGenerator.exe $PWD\\PrismLauncherPortable`;
  $.logStep("Creating installer");
  await $`PortableApps.comInstaller/PortableApps.comInstaller.exe $PWD\\PrismLauncherPortable`;
}

$.log(
  `- ${
    updateAvailable ? "Update to" : "Still using"
  } [Prism Launcher ${latestVersion}](https://github.com/PrismLauncher/PrismLauncher/releases/tag/${latestVersion})`
);
alert("Done!");
