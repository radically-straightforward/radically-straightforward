import http from "node:http";

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
    request.rawBody = "";
    for await (const rawBodyPart of request) {
      console.log(rawBodyPart instanceof Buffer);
      request.rawBody += rawBodyPart;
      if (request.rawBody.length > 10 * 1024 * 1024) {
        response.statusCode = 413;
        response.end();
        return;
      }
    }
    // console.log(request.rawBody);
    // request.body = Object.fromEntries(new URLSearchParams(request.rawBody));

    response.end();
  })
  .listen(8000);
