import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";
import http from "node:http";
import busboy from "busboy";
import "@radically-straightforward/node";

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
          // FIXME: Use `Promise.withResolvers()` when it becomes available in Node.js.
          let bodyPromiseResolve: any;
          let bodyPromiseReject: any;
          const bodyPromises = [
            new Promise((resolve, reject) => {
              bodyPromiseResolve = resolve;
              bodyPromiseReject = reject;
            }),
          ];
          request.pipe(
            // TODO: `busboy` options.
            busboy({ headers: request.headers })
              .on("file", async (name, file, information) => {
                const filename =
                  information.filename.trim() === ""
                    ? "file"
                    : information.filename.replace(/[^a-zA-Z0-9\.\-_]/gu, "-");
                const directoryPromise = fs.mkdtemp(
                  path.join(os.tmpdir(), "server--file--"),
                );
                bodyPromises.push(directoryPromise);
                const directory = await directoryPromise;
                bodyPromises.push(
                  fs.writeFile(path.join(directory, filename), file),
                );
                request.body[name] = {
                  ...information,
                  path: path.join(directory, filename),
                };
                // TODO: Cleanup ‘directory’
              })
              .on("field", (name, value, information) => {
                // TODO: Reject on `information.nameTruncated` or `information.valueTruncated`.
                request.body[name] = value;
              })
              .on("close", () => {
                bodyPromiseResolve();
              })
              // TODO: `partsLimit`, `filesLimit`, `fieldsLimit`.
              .on("error", (error) => {
                bodyPromiseReject(error);
              }),
          );
          await Promise.all(bodyPromises);
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
          request.pathname = match.groups;
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
