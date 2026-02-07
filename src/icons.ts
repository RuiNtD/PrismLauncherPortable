import $, { Path } from "@david/dax";

const pngSizes = [16, 32, 75, 128, 256];
const icoSizes = [16, 32, 48, 256];

// Adapted from https://github.com/PrismLauncher/PrismLauncher/blob/develop/program_info/genicons.sh

const svg = $.request(
  "https://github.com/PrismLauncher/PrismLauncher/raw/refs/heads/develop/program_info/org.prismlauncher.PrismLauncher.svg",
);
async function svg2png(path: Path, size: number) {
  await $`inkscape -w ${size} -h ${size} -o ${path} --pipe`.stdin(svg);
  await $`oxipng --opt max --strip all --alpha --interlace 0 ${path}`.quiet();
}

const tempPath = $.path(await Deno.makeTempDir());
const files: Record<number, Path> = {};
const extraPNGs = icoSizes.filter((v) => !pngSizes.includes(v));

let pb = $.progress("Generating PNGs", {
  length: pngSizes.length + extraPNGs.length,
});

await pb.with(async () => {
  for (const size of [...pngSizes, ...extraPNGs]) {
    const path = pngSizes.includes(size)
      ? $.path(`PrismLauncherPortable/App/AppInfo/appicon_${size}.png`)
      : tempPath.join(`appicon_${size}.png`);
    await svg2png(path, size);
    files[size] = path;
    pb.increment();
  }
});

pb = $.progress("Generating ICO");

await pb.with(async () => {
  const outPath = $.path("PrismLauncherPortable/App/AppInfo/appicon.ico");
  const inPaths = icoSizes.map((size) => files[size]);

  await $`magick ${inPaths} ${outPath}`;
});

await tempPath.ensureRemove({ recursive: true });
