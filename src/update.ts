import $ from "@david/dax";
import { getLatestPrism } from "./prism.ts";
import { redownloadPrism, buildInstaller, buildLauncher } from "./build.ts";
import { readAppInfo, writeAppInfo } from "./appinfo.ts";
import { parse as parseSemver, equals as semverEquals } from "@std/semver";
import { parseArgs } from "@std/cli/parse-args";

const args = parseArgs(Deno.args, {
  boolean: ["pre-release"],
  alias: {
    "pre-release": ["P", "preRelease"],
  },
});

const appinfo = await readAppInfo();
const verParts = appinfo.Version.PackageVersion.split(".");
const currentVersion = verParts.slice(0, 3).join(".");
let updateNum = parseInt(verParts[3]) + 1;
const currentSemver = parseSemver(currentVersion);

$.logLight(
  `Old version: ${appinfo.Version.DisplayVersion} (${appinfo.Version.PackageVersion})`,
);

const latestRelease = await getLatestPrism(args.preRelease);
const latestVersion = latestRelease.tag_name;
const latestSemver = parseSemver(latestVersion);
const baseVersion = `${latestSemver.major}.${latestSemver.minor}.${latestSemver.patch}`;

const updateAvailable = !semverEquals(currentSemver, parseSemver(baseVersion));
if (updateAvailable) updateNum = 0;
appinfo.Version.DisplayVersion = latestVersion;
// if (updateNum > 0) appinfo.Version.DisplayVersion += ` Update ${updateNum}`;

appinfo.Version.PackageVersion = `${baseVersion}.${updateNum}`;

$.log(
  `New version: ${appinfo.Version.DisplayVersion} (${appinfo.Version.PackageVersion})`,
);

if (await $.confirm("Update appinfo.ini?")) {
  await writeAppInfo(appinfo);
  $.logStep("Updated appinfo.ini");
}

if (updateAvailable || (await $.confirm("Redownload Prism Launcher?"))) {
  $.logStep(`Downloading Prism Launcher ${latestVersion}...`);
  await redownloadPrism(latestRelease);
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
