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
  const liveConnections = new Set<any>();

  const httpServer = http
    .createServer(async (request: any, response: any) => {
      try {
        request.id = utilities.randomString();

        request.start = process.hrtime.bigint();

        request.log = (...messageParts: string[]): void => {
          log(
            request.id,
            `${(process.hrtime.bigint() - request.start) / 1_000_000n}ms`,
            ...messageParts,
          );
        };

        request.log(
          "REQUEST",
          request.headers["x-forwarded-for"],
          request.method,
          request.url,
        );

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
                      const valuePath = value.path;
                      await fs.mkdir(path.dirname(valuePath));
                      response.once("close", async () => {
                        await fs.rm(path.dirname(valuePath), {
                          recursive: true,
                          force: true,
                        });
                      });
                      await fs.writeFile(valuePath, file);
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
          request.log(JSON.stringify(request.body, undefined, 2));
      } catch (error: any) {
        request.log("ERROR", String(error));
        if (response.statusCode === 200) response.statusCode = 400;
        response.setHeader("Content-Type", "text/plain; charset=utf-8");
        response.end(String(error));
      }

      if (!response.writableEnded) {
        if (request.method === "GET" && request.URL.pathname === "/_health")
          response.end();
        else if (request.method === "GET" && request.URL.pathname === "/_proxy")
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

            response.setHeader("Content-Type", destinationResponseContentType);
            await stream.pipeline(destinationResponse.body as any, response, {
              signal: AbortSignal.timeout(5 * 60 * 1000),
            });
          } catch (error: any) {
            request.log("ERROR", String(error));
            if (!response.headersSent) {
              if (response.statusCode === 200) response.statusCode = 502;
              response.setHeader("Content-Type", "text/plain; charset=utf-8");
            }
            if (!response.writableEnded) response.end(String(error));
          }
        else {
          const liveConnectionId = request.headers["live-connection"];
          if (typeof liveConnectionId === "string")
            try {
              if (
                request.method !== "GET" ||
                liveConnectionId.match(/^[a-z0-9]{5,}$/) === null
              )
                throw new Error("Invalid ‘Live-Connection’ header.");

              request.liveConnection = [...liveConnections].find(
                (liveConnection) =>
                  liveConnection.request.id === liveConnectionId,
              );
              if (request.liveConnection === undefined) {
                request.log("LIVE CONNECTION CREATE");
                request.liveConnection = {
                  request,
                  response,
                  shouldUpdate: true,
                };
                liveConnections.add(request.liveConnection);
              } else if (request.liveConnection.request.url !== request.url)
                throw new Error("Unmatched ‘url’ of existing request.");
              else {
                request.log(
                  "LIVE CONNECTION ESTABLISH",
                  request.liveConnection.request.id,
                );
                request.liveConnection.response?.liveConnectionEnd?.();
                clearTimeout(request.liveConnection.deleteTimeout);
                request.id = request.liveConnection.request.id;
                request.liveConnection.request = request;
                request.liveConnection.response = response;
              }

              response.once("close", () => {
                request.log("LIVE CONNECTION CLOSE");
                request.liveConnection.deleteTimeout = setTimeout(() => {
                  liveConnections.delete(request.liveConnection);
                }, 30 * 1000);
              });

              response.setHeader(
                "Content-Type",
                "application/json-lines; charset=utf-8",
              );

              const heartbeat = utilities.backgroundJob(
                { interval: 30 * 1000 },
                () => {
                  try {
                    response.write("\n");
                  } catch (error) {
                    request.log(
                      "LIVE CONNECTION HEARTBEAT ERROR",
                      String(error),
                    );
                  }
                },
              );
              response.once("close", () => {
                heartbeat.stop();
              });

              const periodicUpdates = utilities.backgroundJob(
                { interval: 5 * 60 * 1000 },
                () => {
                  request.liveConnection.update?.();
                },
              );
              response.once("close", () => {
                periodicUpdates.stop();
              });

              request.liveConnection.establishing = true;

              response.liveConnectionEnd = response.end;
              response.end = (data?: string): typeof response => {
                request.log("LIVE CONNECTION UPDATE");
                response.write(JSON.stringify(data) + "\n");
                request.liveConnection.writableEnded = true;
                return response;
              };
            } catch (error: any) {
              request.log("LIVE CONNECTION ERROR", String(error));
              response.statusCode = 400;
              response.setHeader("Content-Type", "text/plain; charset=utf-8");
              response.end(String(error));
            }
          else {
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
          }

          do {
            let liveConnectionUpdate;
            if (request.liveConnection !== undefined) {
              request.liveConnection.writableEnded = false;
              liveConnectionUpdate = new Promise((resolve) => {
                request.liveConnection.update = resolve;
              });
            }

            response.state = {};
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
                request.log("ERROR", String(error), error?.stack);
                response.error = error;
              }

              if ((request.liveConnection ?? response).writableEnded) break;
            }

            if (!(request.liveConnection ?? response).writableEnded) {
              request.log(
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

            if (request.liveConnection !== undefined) {
              request.liveConnection.establishing = false;
              request.liveConnection.shouldUpdate = true;
              await liveConnectionUpdate;
            }
          } while (request.liveConnection !== undefined);

          if (
            request.method === "GET" &&
            response.statusCode === 200 &&
            response.getHeader("Content-Type", "text/html; charset=utf-8")
          ) {
            request.log("LIVE CONNECTION PREPARE");
            const liveConnection = {
              request,
              deleteTimeout: setTimeout(() => {
                liveConnections.delete(liveConnection);
              }, 30 * 1000),
            };
            liveConnections.add(liveConnection);
          }
        }
      }

      request.log(
        "RESPONSE",
        String(response.statusCode),
        response.getHeader("Location"),
      );
    })
    .listen(port, "localhost", () => {
      log("START");
    });
  process.once("gracefulTermination", () => {
    httpServer.close();
    for (const liveConnection of liveConnections)
      liveConnection.response?.liveConnectionEnd?.();
  });
  process.once("beforeExit", () => {
    log("STOP");
  });

  return routes;

  function log(...messageParts: string[]): void {
    utilities.log(String(port), ...messageParts);
  }
}
