import http from "node:http";

const application = (nodeRequest, nodeResponse) => {
  for (const handler of application.handlers) {
    if (
      (handler.request.method !== undefined &&
        handler.request.method !== nodeRequest.method) ||
      (handler.request.url !== undefined &&
        handler.request.url !== nodeRequest.url)
    )
      continue;
    const handlerResponse = handler.response(nodeRequest);
    if (handlerResponse.continue) continue;
    nodeResponse.setHeader("Content-Type", "application/json");
    nodeResponse.write(handlerResponse.body);
    nodeResponse.end();
    break;
  }
};

application.handlers = [];

application.handlers.push({
  request: { method: "GET", url: "/a" },
  response: (request) => {
    return { body: "A" };
  },
});

application.handlers.push({
  request: { method: "GET", url: "/b" },
  response: (request) => {
    return { body: "B" };
  },
});

const server = http.createServer(application);

server.listen(8000);
