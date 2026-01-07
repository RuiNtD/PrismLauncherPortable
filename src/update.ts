import $ from "@david/dax";
import { getLatestPrism } from "./prism.ts";
import { redownloadPrism, buildInstaller, buildLauncher } from "./build.ts";
import { readAppInfo, writeAppInfo } from "./appinfo.ts";

const latestVersion = (await getLatestPrism()).tag_name;

const appinfo = await readAppInfo();
const verParts = appinfo.Version.PackageVersion.split(".");
const currentVersion = verParts.slice(0, 3).join(".");
const updateAvailable = currentVersion != latestVersion;

$.logLight(
  `Old version: ${appinfo.Version.DisplayVersion} (${appinfo.Version.PackageVersion})`,
);
const updateNum = updateAvailable ? 0 : parseInt(verParts[3]) + 1;
appinfo.Version.DisplayVersion = latestVersion;
if (updateNum > 0) appinfo.Version.DisplayVersion += ` Update ${updateNum}`;
appinfo.Version.PackageVersion = `${latestVersion}.${updateNum}`;
$.log(
  `New version: ${appinfo.Version.DisplayVersion} (${appinfo.Version.PackageVersion})`,
);

if (await $.confirm("Update appinfo.ini?")) {
  await writeAppInfo(appinfo);
  $.logStep("Updated appinfo.ini");
}

if (updateAvailable || (await $.confirm("Redownload Prism Launcher?"))) {
  $.logStep(`Downloading Prism Launcher ${latestVersion}...`);
  await redownloadPrism(latestVersion);
}

if (updateAvailable || (await $.confirm("Build launcher and installer?"))) {
  await buildLauncher();
  await buildInstaller();
}

$.log();
$.log(
  `- Using [Prism Launcher ${latestVersion}](https://prismlauncher.org/news/release-${latestVersion})`,
);
$.log();

alert("Done!");
