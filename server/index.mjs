import http from "node:http";
import streamConsumers from "node:stream/consumers";

http
  .createServer(async (request, response) => {
    request.rawURL = request.url;
    request.url = new URL(request.url, "http://server");
    request.path = request.url.pathname.match(
      /^\/users\/(?<userId>\d+)\/messages$/
    ).groups;
    request.query = Object.fromEntries(request.url.searchParams);
    request.rawBody = await streamConsumers.text(request);
    request.body = Object.fromEntries(new URLSearchParams(request.rawBody));
    response.end();
  })
  .listen(8000);
