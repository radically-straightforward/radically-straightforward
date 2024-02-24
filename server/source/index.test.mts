import test from "node:test";
import assert from "node:assert/strict";
import server from "@radically-straightforward/server";

test(async () => {
  const application = server(18000);

  let requestsCount = 0;

  application.push({
    method: "GET",
    pathname: /^\/conversations\/(?<conversationId>[0-9]+)$/,
    handler: (request: any, response: any) => {
      response.setHeader("Content-Type", "application/json");
      response.end(
        JSON.stringify({
          pathname: request.pathname,
          search: request.search,
        }),
      );
      response.afters.push(() => {
        requestsCount++;
      });
    },
  });

  assert.deepEqual(
    await (
      await fetch("http://localhost:18000/conversations/10?name=leandro")
    ).json(),
    {
      pathname: { conversationId: "10" },
      search: { name: "leandro" },
    },
  );
  assert.equal(requestsCount, 1);

  process.kill(process.pid);
});
