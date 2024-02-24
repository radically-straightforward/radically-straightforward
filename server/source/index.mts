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
          (request.headers["cookie"] ?? "").split(";").map((pair: any) => {
            const parts = pair
              .split("=")
              .map((part: any) => decodeURIComponent(part.trim()));
            if (parts.length !== 2 || parts.some((part: any) => part === ""))
              throw new Error();
            return parts;
          }),
        );

        request.body = {};
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
          // TODO: `error` event.
          busboy({ headers: request.headers })
            // .on("file", async (name, file, information) => {
            //   // TODO: Verify this use of `streamConsumers`.
            //   const filePromise = streamConsumers.buffer(file);
            //   bodyPromises.push(filePromise);
            //   request.body[name] = {
            //     file: await filePromise,
            //     ...information,
            //   };
            // })
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
