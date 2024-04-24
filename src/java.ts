import z from "zod";
import $ from "@david/dax";

export type JavaVersion = 8 | 17 | 21;

const Release = z.object({
  release_name: z.string(),
  release_link: z.string().url(),
  binary: z.object({
    package: z.object({
      name: z.string(),
      link: z.string(),
      size: z.number(),
    }),
  }),
  version: z.object({
    openjdk_version: z.string(),
  }),
});
type Release = z.infer<typeof Release>;

const cache = new Map<JavaVersion, Release>();

export async function getJavaRelease(version: JavaVersion): Promise<Release> {
  const cached = cache.get(version);
  if (cached) return cached;

  const params = new URLSearchParams({
    architecture: "x64",
    image_type: "jre",
    os: "windows",
    vendor: "eclipse",
  });
  const url = `https://api.adoptium.net/v3/assets/latest/${version}/hotspot?${params}`;
  const release = z.tuple([Release]).parse(await $.request(url).json())[0];
  cache.set(version, release);
  return release;
}

if (import.meta.main) {
  $.log(await getJavaRelease(21));
}
