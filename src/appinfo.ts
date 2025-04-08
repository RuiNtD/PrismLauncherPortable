import { appPath } from "./const.ts";
import * as ini from "ini";
import * as v from "@valibot/valibot";

const AppInfoIni = v.looseObject({
  Version: v.looseObject({
    PackageVersion: v.string(),
    DisplayVersion: v.string(),
  }),
});
type AppInfoIni = v.InferOutput<typeof AppInfoIni>;

const iniPath = appPath.join("AppInfo/appinfo.ini");

export async function readAppInfo(): Promise<AppInfoIni> {
  const appinfo = ini.parse(await iniPath.readText());
  v.assert(AppInfoIni, appinfo);
  return appinfo;
}

export async function writeAppInfo(appinfo: AppInfoIni) {
  await iniPath.writeText(ini.stringify(appinfo));
}
