import test from "node:test";
import assert from "node:assert/strict";
import server from "@radically-straightforward/server";

test(async () => {
  const application = server(18000);

  application.push({
    method: "GET",
    pathname: /^\/conversations\/(?<conversationId>[0-9]+)$/,
    handler: (request: any, response: any) => {
      response.setHeader("Content-Type", "application/json");
      response.end(
        JSON.stringify({
          pathname: request.pathname,
          searchParams: request.searchParams,
        }),
      );
    },
  });

  assert.deepEqual(
    await (
      await fetch("http://localhost:18000/conversations/10?search=leandro")
    ).json(),
    {
      pathname: { conversationId: "10" },
      searchParams: { search: "leandro" },
    },
  );

  process.kill(process.pid);
});
