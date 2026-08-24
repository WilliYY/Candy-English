import assert from "node:assert/strict";
import test from "node:test";

import {
  type AuthenticatedCattyUser,
  handleCattyChatRequest,
  handleCattyHistoryRequest,
} from "@/lib/catty-chat-handler";

test("requires an authenticated user before reading Catty history", async () => {
  const response = await handleCattyHistoryRequest(
    new Request("https://candy.example/api/catty/chat?area=student"),
    null,
  );
  const body = (await response.json()) as {
    messages: unknown[];
    ok: boolean;
    source: string;
  };

  assert.equal(response.status, 401);
  assert.equal(body.ok, false);
  assert.equal(body.source, "unauthorized");
  assert.deepEqual(body.messages, []);
});

test("requires an authenticated user before processing a Catty message", async () => {
  const response = await handleCattyChatRequest(
    new Request("https://candy.example/api/catty/chat", {
      body: JSON.stringify({ message: "Hello" }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    }),
    null,
  );
  const body = (await response.json()) as {
    ok: boolean;
    source: string;
  };

  assert.equal(response.status, 401);
  assert.equal(body.ok, false);
  assert.equal(body.source, "unauthorized");
});

for (const role of ["ADMIN", "TEACHER", "STUDENT"] as const) {
  test(`accepts ${role} authentication before validating a Catty message`, async () => {
    const user: AuthenticatedCattyUser = {
      id: `user-${role.toLowerCase()}`,
      name: role,
      role,
    };
    const response = await handleCattyChatRequest(
      new Request("https://candy.example/api/catty/chat", {
        body: JSON.stringify({ message: "" }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      }),
      user,
    );

    assert.equal(response.status, 400);
  });
}
