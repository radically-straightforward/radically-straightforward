import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";
import http from "node:http";
import busboy from "busboy";
import "@radically-straightforward/node";
import * as utilities from "@radically-straightforward/utilities";

export default function server(port: number): any[] {
  const handlers: any[] = [];

  // TODO: ‘createServer’ options
  // - headersTimeout
  // - maxHeaderSize
  //   - This applies to a single header, and there’s no limit on the number of headers, right?
  // - requestTimeout
  const httpServer = http
    .createServer(async (request: any, response: any) => {
      const directoriesToCleanup = new Array<string>();
      try {
        if (request.method === undefined || request.url === undefined)
          throw new Error("Missing request ‘method’ or ‘url’.");

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
              throw new Error("Malformed ‘Cookie’ header.");
            parts[0] = parts[0].replace(/^__Host-/, "");
            return [parts];
          }),
        );

        request.body = {};
        if (typeof request.headers["content-type"] === "string") {
          const filePromises = new Array<Promise<void>>();
          await new Promise<void>((resolve, reject) => {
            request.pipe(
              busboy({
                headers: request.headers,
                preservePath: true,
                limits: {
                  fields: 300,
                  fieldNameSize: 300,
                  fieldSize: 2 ** 20,
                  files: 100,
                  headerPairs: 200,
                  fileSize: 10 * 2 ** 20,
                },
              })
                .on("field", (name, value, information) => {
                  if (information.nameTruncated || information.valueTruncated)
                    reject(new Error("Truncated field."));
                  if (name.endsWith("[]"))
                    (request.body[name.slice(0, -"[]".length)] ??= []).push(
                      value,
                    );
                  else request.body[name] = value;
                })
                .on("file", (name, file, information) => {
                  const value = {
                    ...information,
                    path: path.join(
                      os.tmpdir(),
                      `server--file--${utilities.randomString()}`,
                      information.filename.trim() === ""
                        ? "file"
                        : information.filename
                            .replace(/[^a-zA-Z0-9\-_\.]/gu, "-")
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
                      directoriesToCleanup.push(path.dirname(value.path));
                      if ((file as any).truncated)
                        throw new Error("Truncated file.");
                    })(),
                  );
                })
                .on("close", () => {
                  resolve();
                })
                .on("fieldsLimit", () => {
                  reject(new Error("Fields limit."));
                })
                .on("filesLimit", () => {
                  reject(new Error("Files limit."));
                })
                .on("error", (error) => {
                  reject(error);
                }),
            );
          });
          await Promise.all(filePromises);
        }

        response.state = {};
        response.afters = [];

        response.setHeader("Content-Type", "text/html; charset=utf-8");

        response.setCookie = (
          key: string,
          value: string,
          maxAge: number = 150 * 24 * 60 * 60,
        ): typeof response => {
          request.cookies[key] = value;
          response.setHeader("Set-Cookie", [
            ...(response.getHeader("Set-Cookie") ?? []),
            `__Host-${encodeURIComponent(key)}=${encodeURIComponent(value)}; Max-Age=${maxAge}; Path=/; Secure; HttpOnly; SameSite=None`,
          ]);
          return response;
        };

        response.deleteCookie = (key: string): typeof response => {
          delete request.cookies[key];
          response.setHeader("Set-Cookie", [
            ...(response.getHeader("Set-Cookie") ?? []),
            `__Host-${encodeURIComponent(key)}=; Max-Age=0; Path=/; Secure; HttpOnly; SameSite=None`,
          ]);
          return response;
        };

        response.redirect = (
          destination: string,
          type: "see-other" | "temporary" | "permanent" = "see-other",
        ): typeof response => {
          response.statusCode = {
            "see-other": 303,
            temporary: 307,
            permanent: 308,
          }[type];
          response.setHeader("Location", new URL(destination, request.URL));
          response.end();
          return response;
        };
      } catch (error) {
        // TODO: Improve this error logging.
        console.error(error);
        response.statusCode = 400;
        response.end("The server failed to parse the request.");
      }

      if (!response.writableEnded) {
        for (const handler of handlers) {
          if ((response.error !== undefined) !== (handler.error ?? false))
            continue;

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

          try {
            await handler.handler(request, response);
          } catch (error) {
            response.error = error;
          }

          if (response.writableEnded) break;
        }

        if (!response.writableEnded) {
          // TODO: Log error
          response.statusCode = 500;
          response.end("The application didn’t finish handling this request.");
        }

        for (const after of response.afters) await after();
      }

      for (const directoryToCleanup of directoriesToCleanup)
        await fs.rm(directoryToCleanup, { recursive: true, force: true });
    })
    .listen(port, "localhost");

  process.once("gracefulTermination", () => {
    httpServer.close();
  });

  return handlers;
}
