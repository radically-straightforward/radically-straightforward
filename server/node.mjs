import http from "node:http";

http
  .createServer((request, response) => {
    console.log(request.path);
    response.end();
  })
  .listen(8000);
