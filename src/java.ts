import z from "zod";
import $ from "@david/dax";
import memoize from "memoize";

export const javaVersions = [8, 17, 21] as const;
export type JavaVersion = (typeof javaVersions)[number];

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

async function _getJavaRelease(version: JavaVersion): Promise<Release> {
  const params = new URLSearchParams({
    architecture: "x64",
    image_type: "jre",
    os: "windows",
    vendor: "eclipse",
  });
  const url = `https://api.adoptium.net/v3/assets/latest/${version}/hotspot?${params}`;
  return z.tuple([Release]).parse(await $.request(url).json())[0];
}
export const getJavaRelease = memoize(_getJavaRelease);

if (import.meta.main) {
  $.log(await getJavaRelease(21));
}
