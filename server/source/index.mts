import http from "node:http";
import "@radically-straightforward/node";

export default function server(port: number): any[] {
  const handlers: any[] = [];
  const httpServer = http
    .createServer(async (request: any, response: any) => {
      response.afters = [];
      if (request.method === undefined || request.url === undefined) {
        response.statusCode = 400;
        response.end();
        return;
      }
      request.URL = new URL(
        request.url,
        `${request.headers["x-forwarded-proto"] ?? "http"}://${
          request.headers["x-forwarded-host"] ?? request.headers["host"]
        }`,
      );
      request.search = Object.fromEntries(request.URL.searchParams);
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

// import streamConsumers from "node:stream/consumers";
// import busboy from "busboy";

// http
//   .createServer(async (request, response) => {
//     request.urlParts = new URL(
//       request.url,
//       `${request.headers["x-forwarded-proto"] ?? "http"}://${
//         request.headers["x-forwarded-host"] ?? request.headers["host"]
//       }`
//     );
//     request.query = Object.fromEntries(request.urlParts.searchParams);
//     request.cookies = Object.fromEntries(
//       (request.headers["cookie"] ?? "").split(";").map((part) => {
//         const parts =
//         part
//           .trim()
//           .split("=");
//           if (parts.length !== 2) throw new Error("TODO: Respond with 400 here")
//           // TODO: Throw if there are more than two parts?
//           parts.map((part) => decodeURIComponent(part.trim()));
//       })
//     );
//     // request.body = {};
//     // // FIXME: Use `Promise.withResolvers()` when it becomes available in Node.js.
//     // let bodyPromiseResolve, bodyPromiseReject;
//     // const bodyPromises = [
//     //   new Promise((resolve, reject) => {
//     //     bodyPromiseResolve = resolve;
//     //     bodyPromiseReject = reject;
//     //   }),
//     // ];
//     // request.pipe(
//     //   // TODO: `busboy` options.
//     //   // TODO: `error` event.
//     //   busboy({ headers: request.headers })
//     //     .on("file", async (name, file, information) => {
//     //       // TODO: Verify this use of `streamConsumers`.
//     //       const filePromise = streamConsumers.buffer(file);
//     //       bodyPromises.push(filePromise);
//     //       request.body[name] = {
//     //         file: await filePromise,
//     //         ...information,
//     //       };
//     //     })
//     //     .on("field", (name, value, information) => {
//     //       // TODO: Reject on `information.nameTruncated` or `information.valueTruncated`.
//     //       request.body[name] = value;
//     //     })
//     //     .on("close", () => {
//     //       bodyPromiseResolve();
//     //     })
//     //     // TODO: `partsLimit`, `filesLimit`, `fieldsLimit`.
//     //     .on("error", (error) => {
//     //       bodyPromiseReject(error);
//     //     })
//     // );
//     // await Promise.all(bodyPromises);
//     // console.log(request.body);

//     request.path = request.urlParts.pathname.match(
//       /^\/users\/(?<userId>\d+)\/messages$/
//     ).groups;

//     response.end();
//   })
//   .listen(8000);
