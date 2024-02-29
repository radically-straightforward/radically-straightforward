import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";
import http from "node:http";
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
  log("STARTING");

  const handlers: any[] = [];

  const httpServer = http
    .createServer(async (request: any, response: any) => {
      {
        const id = utilities.randomString();
        const start = process.hrtime.bigint();
        response.log = (...messageParts: string[]): void => {
          log(
            id,
            `${(process.hrtime.bigint() - start) / 1_000_000n}ms`,
            ...messageParts,
          );
        };
      }

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
      } catch (error: any) {
        response.log("ERROR", String(error));
        if (response.statusCode === 200) response.statusCode = 400;
        response.setHeader("Content-Type", "text/plain; charset=utf-8");
        response.end(String(error));
      }

      if (!response.writableEnded) {
        if (request.URL.pathname === "/proxy") {
          try {
            if (typeof request.search.destination !== "string") {
              response.statusCode = 422;
              throw new Error("Missing ‘destination’.");
            }

            const destination = new URL(request.search.destination);
            if (
              (destination.protocol !== "http:" &&
                destination.protocol !== "https:") ||
              destination.hostname === request.URL.hostname
            ) {
              response.statusCode = 422;
              throw new Error("Invalid destination");
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

            response.setHeader("Content-Type", destinationResponseContentType);
            await destinationResponse.body.pipeTo(response, {
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
        } else {
          for (const handler of handlers) {
            if ((response.error !== undefined) !== (handler.error ?? false))
              continue;

            if (
              (typeof handler.method === "string" &&
                request.method !== handler.method) ||
              (handler.method instanceof RegExp &&
                request.method.match(handler.method) === null)
            )
              continue;

            if (
              typeof handler.pathname === "string" &&
              request.URL.pathname !== handler.pathname
            )
              continue;
            else if (handler.pathname instanceof RegExp) {
              const match = request.URL.pathname.match(handler.pathname);
              if (match === null) continue;
              request.pathname = match.groups ?? {};
            } else request.pathname = {};

            try {
              await handler.handler(request, response);
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

          for (const after of response.afters) await after();
        }
      }

      for (const directoryToCleanup of directoriesToCleanup)
        await fs.rm(directoryToCleanup, { recursive: true, force: true });

      response.log(
        "RESPONSE",
        String(response.statusCode),
        response.getHeader("Location"),
      );
    })
    .listen(port, "localhost");

  process.once("gracefulTermination", () => {
    httpServer.close();
    log("STOPPED");
  });

  return handlers;

  function log(...messageParts: string[]): void {
    utilities.log(String(port), ...messageParts);
  }
}
