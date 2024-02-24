import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";
import http from "node:http";
import busboy from "busboy";
import "@radically-straightforward/node";
import * as utilities from "@radically-straightforward/utilities";

export default function server(port: number): any[] {
  const handlers: any[] = [];

  const httpServer = http
    .createServer(async (request: any, response: any) => {
      try {
        response.afters = [];

        if (request.method === undefined || request.url === undefined)
          throw new Error();

        request.URL = new URL(
          request.url,
          `${request.headers["x-forwarded-proto"] ?? "http"}://${
            request.headers["x-forwarded-host"] ?? request.headers["host"]
          }`,
        );

        request.search = Object.fromEntries(request.URL.searchParams);

        request.cookies = Object.fromEntries(
          (request.headers["cookie"] ?? "").split(";").flatMap((pair: any) => {
            if (pair.trim() === "") return [];
            const parts = pair
              .split("=")
              .map((part: any) => decodeURIComponent(part.trim()));
            if (parts.length !== 2 || parts.some((part: any) => part === ""))
              throw new Error();
            return [parts];
          }),
        );

        request.body = {};
        if (typeof request.headers["content-type"] === "string") {
          const filePromises = new Array<Promise<void>>();
          await new Promise<void>((resolve, reject) => {
            request.pipe(
              // TODO: `busboy` options.
              busboy({ headers: request.headers })
                .on("file", (name, file, information) => {
                  const value = {
                    ...information,
                    path: path.join(
                      os.tmpdir(),
                      `server--file--${utilities.randomString()}`,
                      information.filename.trim() === ""
                        ? "file"
                        : information.filename
                            .replace(/[^a-zA-Z0-9\.\-_]/gu, "-")
                            .toLowerCase(),
                    ),
                  };
                  if (name.endsWith("[]"))
                    (request.body[name.slice(0, -"[]".length)] ??= []).push(
                      value,
                    );
                  else request.body[name] = value;
                  filePromises.push(
                    (async (): Promise<void> => {
                      await fs.mkdir(path.dirname(value.path));
                      await fs.writeFile(value.path, file);
                      // TODO: Cleanup ‘directory’
                    })(),
                  );
                })
                .on("field", (name, value, information) => {
                  // TODO: Reject on `information.nameTruncated` or `information.valueTruncated`.
                  if (name.endsWith("[]"))
                    (request.body[name.slice(0, -"[]".length)] ??= []).push(
                      value,
                    );
                  else request.body[name] = value;
                })
                .on("close", () => {
                  resolve();
                })
                // TODO: `partsLimit`, `filesLimit`, `fieldsLimit`, and other busboy events.
                .on("error", (error) => {
                  reject(error);
                }),
            );
          });
          await Promise.all(filePromises);
        }

        response.setHeader("Content-Type", "text/html; charset=utf-8");
      } catch (error) {
        console.error(error);
        response.statusCode = 400;
        response.end();
        return;
      }

      for (const handler of handlers) {
        if (
          handler.method !== undefined &&
          request.method.match(handler.method) === null
        )
          continue;

        if (handler.pathname === undefined) request.pathname = {};
        else {
          const match = request.URL.pathname.match(handler.pathname);
          if (match === null) continue;
          request.pathname = match.groups ?? {};
        }

        await handler.handler(request, response);
      }

      for (const after of response.afters) await after();
    })
    .listen(port, "localhost");

  process.once("gracefulTermination", () => {
    httpServer.close();
  });

  return handlers;
}
