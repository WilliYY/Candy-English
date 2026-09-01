import assert from "node:assert/strict";
import test from "node:test";

import {
  createLoginIpHash,
  getLoginIpHash,
  getTrustedProxyClientIp,
} from "../login-request-security";

const TEST_SECRET = "test-only-secret-with-at-least-32-characters";

test("prioritizes the IP set by the trusted reverse proxy", () => {
  const headers = new Headers({
    "x-forwarded-for": "203.0.113.7, 198.51.100.9",
    "x-real-ip": "192.0.2.25",
  });

  assert.equal(getTrustedProxyClientIp(headers), "192.0.2.25");
});

test("uses the last valid forwarded address when x-real-ip is absent", () => {
  const headers = new Headers({
    "x-forwarded-for": "invalid, 203.0.113.7, 198.51.100.9",
  });

  assert.equal(getTrustedProxyClientIp(headers), "198.51.100.9");
});

test("normalizes IPv4-mapped IPv6 and never returns the raw IP as hash", () => {
  const headers = new Headers({ "x-real-ip": "::ffff:203.0.113.7" });
  const hash = getLoginIpHash(headers, TEST_SECRET);

  assert.equal(getTrustedProxyClientIp(headers), "203.0.113.7");
  assert.match(hash ?? "", /^[a-f0-9]{64}$/);
  assert.doesNotMatch(hash ?? "", /203\.0\.113\.7/);
  assert.equal(hash, createLoginIpHash("203.0.113.7", TEST_SECRET));
});

test("refuses malformed addresses and weak hashing secrets", () => {
  assert.equal(
    getLoginIpHash(new Headers({ "x-real-ip": "not-an-ip" }), TEST_SECRET),
    null,
  );
  assert.equal(createLoginIpHash("203.0.113.7", "too-short"), null);
});
