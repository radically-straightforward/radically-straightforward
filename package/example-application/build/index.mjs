import sharp from "sharp";

console.log(
  JSON.stringify(
    {
      argv: process.argv,
      env: {
        PACKAGE: process.env.PACKAGE,
        EXAMPLE_PROGRAM: process.env.EXAMPLE_PROGRAM,
      },
      image: (
        await sharp({
          create: {
            width: 5,
            height: 5,
            channels: 3,
            background: { r: 255, g: 0, b: 0 },
          },
        })
          .raw()
          .toBuffer()
      ).toString("base64"),
    },
    undefined,
    2,
  ),
);

process.exit(1);
