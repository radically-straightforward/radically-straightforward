import timers from "node:timers/promises";
import url from "node:url";
import fs from "node:fs/promises";
import net from "node:net";

export async function time(
  title: string,
  function_: (() => void) | (() => Promise<void>),
): Promise<void> {
  const start = process.hrtime.bigint();
  await function_();
  time.report(title, elapsedTime(start));
}

time.report = (title: string, time: bigint): void => {
  console.log(`${title}: ${time}ms`);
};

export function elapsedTime(
  start: bigint,
  end: bigint = process.hrtime.bigint(),
): bigint {
  return (end - start) / 1_000_000n;
}

export function eventLoopActive(): Promise<void> {
  return new Promise<void>((resolve) => {
    const abortController = new AbortController();
    timers
      .setInterval(1 << 30, undefined, {
        signal: abortController.signal,
      })
      [Symbol.asyncIterator]()
      .next()
      .catch(() => {});
    for (const event of [
      "exit",
      "SIGHUP",
      "SIGINT",
      "SIGQUIT",
      "SIGTERM",
      "SIGUSR2",
      "SIGBREAK",
    ])
      process.on(event, () => {
        abortController.abort();
        resolve();
      });
  });
}

export async function isExecuted(importMetaUrl: string): Promise<boolean> {
  return (
    url.fileURLToPath(importMetaUrl) === (await fs.realpath(process.argv[1]))
  );
}

// References:
// - https://github.com/sindresorhus/get-port/blob/85c18678143f2c673bdaf5307971397b29ddf28b/index.js#L42-L54
// - https://github.com/node-modules/detect-port/blob/9804ad50f49e3256e54ac40165b16fa6c2fa8d5a/lib/detect-port.js
// - https://gist.github.com/timoxley/1689041
export function portAvailable(
  port: number,
  hostname?: string,
): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer().unref();
    server.on("error", () => {
      resolve(false);
    });
    server.listen(port, hostname, () => {
      server.close(() => {
        resolve(true);
      });
    });
  });
}
