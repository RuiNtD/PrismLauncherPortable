import z from "zod";
import $ from "@david/dax";
import * as ini from "@std/ini";
import { ZipReader, Uint8ArrayWriter } from "@zip-js/zip-js";
import { getLatestPrism } from "./prism.ts";
import { JavaVersion, getJavaRelease } from "./java.ts";
import * as dotenv from "@std/dotenv";

$.setPrintCommand(true);

const AppInfoIni = z.object({
  Version: z.object({
    PackageVersion: z.string(),
    DisplayVersion: z.string(),
  }),
});
type AppInfoIni = z.infer<typeof AppInfoIni>;

const latestVersion = (await getLatestPrism()).tag_name;

const appPath = $.path("PrismLauncherPortable").join("App");
const iniPath = appPath.join("AppInfo", "appinfo.ini");
const appinfo = <AppInfoIni>ini.parse(await iniPath.readText());
AppInfoIni.parse(appinfo);

const versionArray = appinfo.Version.PackageVersion.split(".");
const currentVersion = versionArray.slice(0, 2).join(".");
const updateAvailable = currentVersion != latestVersion;

$.logLight(
  `Old version: ${appinfo.Version.DisplayVersion} (${appinfo.Version.PackageVersion})`
);
const updateNum = updateAvailable ? 0 : parseInt(versionArray[2]) + 1;
appinfo.Version.DisplayVersion = latestVersion;
if (updateNum > 0) appinfo.Version.DisplayVersion += ` Update ${updateNum}`;
appinfo.Version.PackageVersion = `${latestVersion}.${updateNum}.0`;
$.log(
  `New version: ${appinfo.Version.DisplayVersion} (${appinfo.Version.PackageVersion})`
);

if (await $.confirm("Update appinfo.ini?")) {
  await iniPath.writeText(
    // @std/ini's stringify has some weeeeeird formatting
    ini.stringify(appinfo).replaceAll("\n[", "\n\n[") + "\n"
  );
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

if (updateAvailable || (await $.confirm("Redownload Prism Launcher?"))) {
  for (const download of downloads) {
    const path = appPath.join(download.dir);
    const url = `${urlBase}/${download.filename}`;
    await path.emptyDir();

    const req = await $.request(url).showProgress({ noClear: true });
    const zipReader = new ZipReader(req);
    const entries = await zipReader.getEntries();

    for (const entry of entries) {
      if (!entry.getData) continue;
      if (entry.filename == "prismlauncher_updater.exe") continue;

      const uint8 = await entry.getData(new Uint8ArrayWriter());
      const filePath = path.join(entry.filename);

      if (entry.directory) await filePath.ensureDir();
      else await filePath.write(uint8);
    }
  }
}

async function getJavaVer(version: JavaVersion) {
  const relFile = appPath.join(`jre${version}`, "release");
  if (!(await relFile.exists())) return;

  const data = dotenv.parse(await relFile.readText());
  return { java: data.JAVA_VERSION, full: data.FULL_VERSION };
}

async function updateJava(version: JavaVersion) {
  const jreDir = appPath.join(`jre${version}`);
  const release = await getJavaRelease(version);
  if (release.version.openjdk_version == (await getJavaVer(version))?.full) {
    $.logLight(`Skipping Java ${version} (Already up to date)`);
    return;
  }
  jreDir.emptyDir();

  const url = release.binary.package.link;
  const req = await $.request(url).showProgress({ noClear: true });
  const zipReader = new ZipReader(req);
  const entries = await zipReader.getEntries();

  for (const entry of entries) {
    if (!entry.getData) continue;

    const uint8 = await entry.getData(new Uint8ArrayWriter());
    const filename = entry.filename.split("/").slice(1).join("/");
    const filePath = jreDir.join(filename);

    if (entry.directory) await filePath.ensureDir();
    else await filePath.write(uint8);
  }
}

await updateJava(8);
await updateJava(17);
await updateJava(21);

if (updateAvailable || (await $.confirm("Create launcher and installer?"))) {
  $.logStep("Creating launcher");
  await $`PortableApps.comLauncher/PortableApps.comLauncherGenerator.exe $PWD\\PrismLauncherPortable`;
  $.logStep("Creating installer");
  await $`PortableApps.comInstaller/PortableApps.comInstaller.exe $PWD\\PrismLauncherPortable`;
}

async function logJavaVersion(version: JavaVersion) {
  const release = await getJavaRelease(version);
  const vers = (await getJavaVer(version))?.java;
  $.log(`- Includes [Java ${vers}](${release.release_link})`);
}

$.log();
$.log(
  `- Using [Prism Launcher ${latestVersion}](https://prismlauncher.org/news/release-${latestVersion})`
);
await logJavaVersion(8);
await logJavaVersion(17);
await logJavaVersion(21);
$.log();

alert("Done!");
