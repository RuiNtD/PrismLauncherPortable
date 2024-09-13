import z from "zod";

const GHAsset = z.object({
  name: z.string(),
  size: z.number(),
  browser_download_url: z.string().url(),
});

const GHRelease = z.object({
  name: z.string(),
  tag_name: z.string(),
  assets: GHAsset.array(),
});
type GHRelease = z.infer<typeof GHRelease>;

let cache: GHRelease | undefined;

export async function getLatestPrism(): Promise<GHRelease> {
  if (cache) return cache;

  const url =
    "https://api.github.com/repos/PrismLauncher/PrismLauncher/releases/latest";
  const resp = await fetch(url);
  cache = GHRelease.parse(await resp.json());
  return cache;
}

if (import.meta.main) {
  console.log(await getLatestPrism());
}
