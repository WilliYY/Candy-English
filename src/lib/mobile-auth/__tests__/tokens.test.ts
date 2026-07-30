import assert from "node:assert/strict";
import test from "node:test";

import {
  createMobileToken,
  hashMobileToken,
  parseBearerToken,
} from "../tokens";

test("creates unique prefixed tokens and stores only deterministic hashes", () => {
  const first = createMobileToken("access");
  const second = createMobileToken("access");
  const refresh = createMobileToken("refresh");

  assert.match(first.value, /^cea_[A-Za-z0-9_-]{43}$/);
  assert.match(refresh.value, /^cer_[A-Za-z0-9_-]{64}$/);
  assert.notEqual(first.value, second.value);
  assert.equal(first.hash, hashMobileToken(first.value));
  assert.notEqual(first.hash, first.value);
  assert.match(first.hash, /^[a-f0-9]{64}$/);
});

test("accepts one strict Bearer access token", () => {
  const token = createMobileToken("access").value;

  assert.equal(parseBearerToken(`Bearer ${token}`), token);
  assert.equal(parseBearerToken(`bearer ${token}`), token);
});

test("rejects malformed, refresh, and ambiguous authorization headers", () => {
  const access = createMobileToken("access").value;
  const refresh = createMobileToken("refresh").value;

  assert.equal(parseBearerToken(undefined), null);
  assert.equal(parseBearerToken(access), null);
  assert.equal(parseBearerToken(`Basic ${access}`), null);
  assert.equal(parseBearerToken(`Bearer ${refresh}`), null);
  assert.equal(parseBearerToken(`Bearer ${access}, Bearer ${access}`), null);
});
