import $ from "@david/dax";
import * as v from "@valibot/valibot";
import * as ini from "ini";
import { ZipReader, Uint8ArrayWriter } from "@zip-js/zip-js";
import { getLatestPrism } from "./prism.ts";
import { gray, green } from "@std/fmt/colors";

const AppInfoIni = v.object({
  Version: v.object({
    PackageVersion: v.string(),
    DisplayVersion: v.string(),
  }),
});
type AppInfoIni = v.InferOutput<typeof AppInfoIni>;

const latestVersion = (await getLatestPrism()).tag_name;

const appPath = $.path("PrismLauncherPortable/App");
const iniPath = appPath.join("AppInfo/appinfo.ini");
const appinfo = <AppInfoIni>ini.parse(await iniPath.readText());
v.parse(AppInfoIni, appinfo);

const versionArray = appinfo.Version.PackageVersion.split(".");
const currentVersion = versionArray.slice(0, 2).join(".");
const updateAvailable = currentVersion != latestVersion;

$.log(
  gray(
    `Old version: ${appinfo.Version.DisplayVersion} (${appinfo.Version.PackageVersion})`
  )
);
const updateNum = updateAvailable ? 0 : parseInt(versionArray[2]) + 1;
appinfo.Version.DisplayVersion = latestVersion;
if (updateNum > 0) appinfo.Version.DisplayVersion += ` Update ${updateNum}`;
appinfo.Version.PackageVersion = `${latestVersion}.${updateNum}.0`;
$.log(
  `New version: ${appinfo.Version.DisplayVersion} (${appinfo.Version.PackageVersion})`
);

if (confirm("Update appinfo.ini?")) {
  await iniPath.writeText(ini.stringify(appinfo));
  $.log(green("Updated appinfo.ini"));
}

type Download = {
  dir: string;
  filename: string;
};

const urlBase = `https://github.com/PrismLauncher/PrismLauncher/releases/download/${latestVersion}`;
const downloads: Download[] = [
  {
    dir: "PrismLauncher",
    filename: `PrismLauncher-Windows-MinGW-w64-Portable-${latestVersion}.zip`,
  },
  {
    dir: "PrismLauncherARM64",
    filename: `PrismLauncher-Windows-MSVC-arm64-Portable-${latestVersion}.zip`,
  },
];

if (updateAvailable || confirm("Redownload Prism Launcher?")) {
  for await (const file of appPath.readDir()) {
    if (!file.isDirectory) continue;
    if (file.name == "AppInfo") continue;

    await file.path.remove({ recursive: true });
  }

  $.log("Downloading...");

  for (const download of downloads) {
    const path = appPath.join(download.dir);
    const url = `${urlBase}/${download.filename}`;
    await path.mkdir({ recursive: true });

    const { body: resp } = await fetch(url);
    if (!resp) throw new Error(`Failed to download ${url}`);
    const zipReader = new ZipReader(resp);
    const entries = await zipReader.getEntries();

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

if (updateAvailable || confirm("Create launcher and installer?")) {
  const dir = $.path("./PrismLauncherPortable").resolve();
  $.log(green("Creating launcher"));
  await $`./PortableApps.comLauncher/PortableApps.comLauncherGenerator.exe ${dir}`;
  $.log(green("Creating installer"));
  await $`./PortableApps.comInstaller/PortableApps.comInstaller.exe ${dir}`;
}

$.log();
$.log(
  `- Using [Prism Launcher ${latestVersion}](https://prismlauncher.org/news/release-${latestVersion})`
);
$.log();

alert("Done!");
