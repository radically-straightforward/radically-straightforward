import http from "node:http";

// http
//   .createServer((request, response) => {
//     console.log(request.read());
//     response.end();
//   })
//   .listen(8000);
process.stdout.write(process.stdin.read());
