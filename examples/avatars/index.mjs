import path from "node:path";
import fs from "node:fs/promises";
import sharp from "sharp";

await fs.mkdir("png", { recursive: true });
await fs.mkdir("webp", { recursive: true });
for (const [index, original] of (await fs.readdir("original")).entries()) {
  const image = sharp(path.join("original", original)).rotate().resize({
    width: 256,
    height: 256,
    position: sharp.strategy.attention,
  });
  await image.toFile(`png/${index}.png`);
  await image.toFile(`webp/${index}.webp`);
}
