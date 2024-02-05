import http from "node:http";
import streamConsumers from "node:stream/consumers";
import busboy from "busboy";

http
  .createServer(async (request, response) => {
    request.rawURL = request.url;
    request.url = new URL(request.url, "http://server");
    request.path = request.url.pathname.match(
      /^\/users\/(?<userId>\d+)\/messages$/
    ).groups;
    request.query = Object.fromEntries(request.url.searchParams);
    request.cookies = Object.fromEntries(
      request.headers.cookie.split(";").map((cookie) =>
        cookie
          .trim()
          .split("=")
          .map((part) => decodeURIComponent(part.trim()))
      )
    );
    request.body = {};
    // FIXME: Use `Promise.withResolvers()` when it becomes available in Node.js.
    let bodyPromiseResolve, bodyPromiseReject;
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
        .on("file", async (name, file, information) => {
          // TODO: Verify this use of `streamConsumers`.
          const filePromise = streamConsumers.buffer(file);
          bodyPromises.push(filePromise);
          request.body[name] = {
            file: await filePromise,
            ...information,
          };
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
        })
    );
    await Promise.all(bodyPromises);
    console.log(request.body);
    response.end();
  })
  .listen(8000);
