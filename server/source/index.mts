import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";
import http from "node:http";
import stream from "node:stream/promises";
import busboy from "busboy";
import "@radically-straightforward/node";
import * as utilities from "@radically-straightforward/utilities";

export default function server({
  port = 18000,
  csrfProtectionPathnameException = "",
}: {
  port?: number;
  csrfProtectionPathnameException?: string | RegExp;
} = {}): any[] {
  const routes = new Array<any>();

  const connections = new Set<any>();

  const httpServer = http
    .createServer(async (request: any, response: any) => {
      request.start = process.hrtime.bigint();
      request.id = utilities.randomString();

      response.log = (...messageParts: string[]): void => {
        log(
          request.id,
          `${(process.hrtime.bigint() - request.start) / 1_000_000n}ms`,
          ...messageParts,
        );
      };

      response.log(
        "REQUEST",
        request.headers["x-forwarded-for"],
        request.method,
        request.url,
      );

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

        if (
          request.method !== "GET" &&
          request.headers["csrf-protection"] !== "true" &&
          ((typeof csrfProtectionPathnameException === "string" &&
            request.URL.pathname !== csrfProtectionPathnameException) ||
            (csrfProtectionPathnameException instanceof RegExp &&
              request.URL.pathname.match(csrfProtectionPathnameException) ===
                null))
        ) {
          response.statusCode = 403;
          throw new Error(
            "This request appears to have come from outside the application. Please close this tab and start again. (Cross-Site Request Forgery (CSRF) protection failed.)",
          );
        }

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
                  headerPairs: 200,
                  fields: 300,
                  fieldNameSize: 300,
                  fieldSize: 2 ** 20,
                  files: 100,
                  fileSize: 10 * 2 ** 20,
                },
              })
                .on("field", (name, value, information) => {
                  if (information.nameTruncated || information.valueTruncated) {
                    response.statusCode = 413;
                    reject(new Error("Field too large."));
                  }
                  if (name.endsWith("[]"))
                    (request.body[name.slice(0, -"[]".length)] ??= []).push(
                      value,
                    );
                  else request.body[name] = value;
                })
                .on("file", (name, file, information) => {
                  if (information.filename.length > 200) {
                    response.statusCode = 413;
                    reject(new Error("File name too large."));
                  }
                  const value = {
                    ...information,
                    path: path.join(
                      os.tmpdir(),
                      `server--file--${utilities.randomString()}`,
                      information.filename.trim() === ""
                        ? "file"
                        : information.filename
                            .replace(/[^A-Za-z0-9\-_\.]/gu, "-")
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
                      if ((file as any).truncated) {
                        response.statusCode = 413;
                        throw new Error("File too large.");
                      }
                    })(),
                  );
                })
                .on("close", () => {
                  resolve();
                })
                .on("fieldsLimit", () => {
                  response.statusCode = 413;
                  reject(new Error("Too many fields."));
                })
                .on("filesLimit", () => {
                  response.statusCode = 413;
                  reject(new Error("Too many files."));
                })
                .on("error", (error) => {
                  reject(error);
                }),
            );
          });
          await Promise.all(filePromises);
        }

        if (process.env.NODE_ENV !== "production" && request.method !== "GET")
          response.log(JSON.stringify(request.body, undefined, 2));

        response.state = {};

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
      } catch (error: any) {
        response.log("ERROR", String(error));
        if (response.statusCode === 200) response.statusCode = 400;
        response.setHeader("Content-Type", "text/plain; charset=utf-8");
        response.end(String(error));
      }

      if (!response.writableEnded)
        switch (request.URL.pathname) {
          case "/_health":
            response.end();
            break;
          case "/_proxy":
            try {
              if (typeof request.search.destination !== "string") {
                response.statusCode = 422;
                throw new Error("Missing ‘destination’ search parameter.");
              }

              let destination: URL;
              try {
                destination = new URL(request.search.destination);
              } catch (error) {
                response.statusCode = 422;
                throw new Error("Invalid destination.");
              }
              if (
                (destination.protocol !== "http:" &&
                  destination.protocol !== "https:") ||
                destination.hostname === request.URL.hostname
              ) {
                response.statusCode = 422;
                throw new Error("Invalid destination.");
              }

              const destinationResponse = await fetch(destination.href, {
                signal: AbortSignal.timeout(30 * 1000),
              });
              const destinationResponseContentType =
                destinationResponse.headers.get("Content-Type");
              if (
                !destinationResponse.ok ||
                typeof destinationResponseContentType !== "string" ||
                destinationResponseContentType.match(
                  new RegExp("^(?:image|video|audio)/"),
                ) === null ||
                !(destinationResponse.body instanceof ReadableStream)
              )
                throw new Error("Invalid destination response.");

              response.setHeader(
                "Content-Type",
                destinationResponseContentType,
              );
              await stream.pipeline(destinationResponse.body as any, response, {
                signal: AbortSignal.timeout(5 * 60 * 1000),
              });
            } catch (error: any) {
              response.log("ERROR", String(error));
              if (!response.headersSent) {
                if (response.statusCode === 200) response.statusCode = 502;
                response.setHeader("Content-Type", "text/plain; charset=utf-8");
              }
              if (!response.writableEnded) response.end(String(error));
            }
            break;
          default:
            response.setHeader("Content-Type", "text/html; charset=utf-8");

            for (const route of routes) {
              if ((response.error !== undefined) !== (route.error ?? false))
                continue;

              if (
                (typeof route.method === "string" &&
                  request.method !== route.method) ||
                (route.method instanceof RegExp &&
                  request.method.match(route.method) === null)
              )
                continue;

              if (
                typeof route.pathname === "string" &&
                request.URL.pathname !== route.pathname
              )
                continue;
              else if (route.pathname instanceof RegExp) {
                const match = request.URL.pathname.match(route.pathname);
                if (match === null) continue;
                request.pathname = match.groups ?? {};
              } else request.pathname = {};

              try {
                await route.handler(request, response);
              } catch (error: any) {
                response.log("ERROR", String(error), error?.stack);
                response.error = error;
              }

              if (response.writableEnded) break;
            }

            if (!response.writableEnded) {
              response.log(
                "ERROR",
                "The application didn’t finish handling this request.",
              );
              if (!response.headersSent) {
                response.statusCode = 500;
                response.setHeader("Content-Type", "text/plain; charset=utf-8");
              }
              response.end(
                "The application didn’t finish handling this request.",
              );
            }
            break;
        }

      for (const directoryToCleanup of directoriesToCleanup)
        await fs.rm(directoryToCleanup, { recursive: true, force: true });

      if (
        request.method === "GET" &&
        response.statusCode === 200 &&
        response.getHeader("Content-Type", "text/html; charset=utf-8")
      )
        connections.add({ request });

      response.log(
        "RESPONSE",
        String(response.statusCode),
        response.getHeader("Location"),
      );
    })
    .listen(port, "localhost", () => {
      log("STARTED");
    });

  utilities.backgroundJob({ interval: 2 * 60 * 1000 }, () => {
    const now = process.hrtime.bigint();
    for (const connection of connections)
      if (
        connection.response === undefined &&
        30 * 1000 * 1_000_000 < now - connection.request.start
      )
        connections.delete(connection);
  });

  process.once("gracefulTermination", () => {
    httpServer.close((error) => {
      log("STOPPED", String(error ?? ""));
    });
  });

  return routes;

  function log(...messageParts: string[]): void {
    utilities.log(String(port), ...messageParts);
  }
}
