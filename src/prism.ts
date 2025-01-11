import * as v from "@valibot/valibot";

const GHAsset = v.object({
  name: v.string(),
  size: v.number(),
  browser_download_url: v.pipe(v.string(), v.url()),
});

const GHRelease = v.object({
  name: v.string(),
  tag_name: v.string(),
  assets: v.array(GHAsset),
});
type GHRelease = v.InferOutput<typeof GHRelease>;

let cache: GHRelease | undefined;

export async function getLatestPrism(): Promise<GHRelease> {
  if (cache) return cache;

  const url =
    "https://api.github.com/repos/PrismLauncher/PrismLauncher/releases/latest";
  const resp = await fetch(url);
  cache = v.parse(GHRelease, await resp.json());
  return cache;
}

if (import.meta.main) {
  console.log(await getLatestPrism());
}
