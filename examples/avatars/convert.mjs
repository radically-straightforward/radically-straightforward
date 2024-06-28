import path from "node:path";
import fs from "node:fs/promises";
import sharp from "sharp";

const originalsPath = process.argv[2];
const destinationPath = process.argv[3];

await fs.mkdir(path.join(destinationPath, "png"), { recursive: true });
await fs.mkdir(path.join(destinationPath, "webp"), { recursive: true });
const originals = await fs.readdir(originalsPath);

for (const [index, original] of originals.entries())
  await sharp(path.join(originalsPath, original))
    .rotate()
    .resize({
      width: 256,
      height: 256,
      position: sharp.strategy.attention,
    })
    .toFile(path.join(destinationPath, `png/${index}.png`));

for (const index of originals.keys())
  await sharp(path.join(destinationPath, `png/${index}.png`)).toFile(
    path.join(destinationPath, `webp/${index}.webp`)
  );
