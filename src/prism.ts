import { Octokit, RestEndpointMethodTypes } from "@octokit/rest";

const octokit = new Octokit();

export type GHRelease =
  RestEndpointMethodTypes["repos"]["listReleases"]["response"]["data"][0];

let cache: GHRelease | undefined;
let preCache: GHRelease | undefined;

export async function getLatestPrism(prerelease = false): Promise<GHRelease> {
  if (!prerelease) {
    if (cache) return cache;
    const { data: release } = await octokit.rest.repos.getLatestRelease({
      owner: "PrismLauncher",
      repo: "PrismLauncher",
    });
    cache = release;
    return release;
  } else {
    if (preCache) return preCache;
    const { data: releases } = await octokit.rest.repos.listReleases({
      owner: "PrismLauncher",
      repo: "PrismLauncher",
      per_page: 1,
    });
    const release = releases[0];
    preCache = release;
    return release;
  }
}

if (import.meta.main) {
  const latest = await getLatestPrism();
  const pre = await getLatestPrism(true);
  console.log(latest.name);
  console.log(pre.name);

  console.log(latest.assets.map((v) => v.name).join("\n"));
}
