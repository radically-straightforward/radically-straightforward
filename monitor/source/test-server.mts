import http from "http";

http
  .createServer((request, response) => {
    response.end();
  })
  .listen(18000);
