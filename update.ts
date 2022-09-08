import * as ini from "https://esm.sh/ini@3.0.1";
import { join, basename } from "https://deno.land/std@0.154.0/path/mod.ts";
import {
  ZipReader,
  HttpReader,
  Uint8ArrayWriter,
} from "https://deno.land/x/zipjs@v2.6.21/index.js";
import { emptyDir } from "https://deno.land/std@0.154.0/fs/mod.ts";

const tags = await (
  await fetch("https://api.github.com/repos/PolyMC/PolyMC/tags")
).json();
const version = tags[0].name;

const iniPath = "PolyMCPortable/App/AppInfo/appinfo.ini";
const appinfo = ini.parse(await Deno.readTextFile(iniPath));

const updateAvailable = appinfo.Version.DisplayVersion != version;
const patchNum = updateAvailable
  ? 0
  : parseInt(
      (appinfo.Version.PackageVersion as string).split(".").pop() as string
    ) + 1;
appinfo.Version.DisplayVersion = version;
appinfo.Version.PackageVersion = `${version}.${patchNum}`;
console.log("New version:", appinfo.Version.PackageVersion);

if (updateAvailable || confirm("Update appinfo.ini?")) {
  await Deno.writeTextFile(iniPath, ini.stringify(appinfo));
  console.log("Updated appinfo.ini");
}
console.log();

if (updateAvailable || confirm("Redownload PolyMC?")) {
  const urlBase = `https://github.com/PolyMC/PolyMC/releases/download/${version}`;
  for (const [path, url] of [
    ["PolyMCPortable/App/PolyMC", `${urlBase}/PolyMC-Windows-${version}.zip`],
    [
      "PolyMCPortable/App/Legacy",
      `${urlBase}/PolyMC-Windows-Legacy-${version}.zip`,
    ],
  ]) {
    console.log("Downloading", basename(url));
    const zipReader = new ZipReader(new HttpReader(url));
    const entries = await zipReader.getEntries();

    await emptyDir(path);
    await Deno.writeTextFile(
      join(path, "whatgoeshere.txt"),
      "This directory is where the polymc.exe would exist if we had one"
    );

    console.log("Extracting...");
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
  } [PolyMC ${version}](https://github.com/PolyMC/PolyMC/releases/tag/${version})`
);
alert("Done!");
