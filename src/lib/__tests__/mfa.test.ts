import assert from "node:assert/strict";
import test from "node:test";

import {
  buildMfaProvisioningUri,
  createTotpCode,
  decryptMfaSecret,
  encodeBase32,
  encryptMfaSecret,
  findRecoveryCodeHash,
  generateRecoveryCodes,
  hashRecoveryCode,
  verifyMfaCredential,
  verifyTotpCode,
} from "../mfa";

const previousAuthSecret = process.env.AUTH_SECRET;
process.env.AUTH_SECRET = "test-auth-secret-with-at-least-32-characters";

test.after(() => {
  if (previousAuthSecret === undefined) {
    delete process.env.AUTH_SECRET;
    return;
  }

  process.env.AUTH_SECRET = previousAuthSecret;
});

test("matches the RFC 6238 SHA-1 vector after reducing to six digits", () => {
  const secret = encodeBase32(Buffer.from("12345678901234567890", "ascii"));
  const timeStep = 59 / 30;
  const integerTimeStep = Math.floor(timeStep);

  assert.equal(createTotpCode(secret, integerTimeStep), "287082");
  assert.equal(verifyTotpCode(secret, "287 082", { now: 59_000 }), 1);
  assert.equal(verifyTotpCode(secret, "000000", { now: 59_000 }), null);
});

test("encrypts the MFA secret with authenticated encryption", () => {
  const secret = "JBSWY3DPEHPK3PXP";
  const encrypted = encryptMfaSecret(secret);
  const encryptedParts = encrypted.split(".");
  const tamperedCiphertext = Buffer.from(encryptedParts[3]!, "base64url");
  tamperedCiphertext[0] = tamperedCiphertext[0]! ^ 1;
  encryptedParts[3] = tamperedCiphertext.toString("base64url");

  assert.notEqual(encrypted, secret);
  assert.equal(decryptMfaSecret(encrypted), secret);
  assert.throws(() => decryptMfaSecret(encryptedParts.join(".")));
});

test("generates one-time recovery codes and finds only a valid hash", () => {
  const codes = generateRecoveryCodes();
  const hashes = codes.map(hashRecoveryCode);

  assert.equal(codes.length, 10);
  assert.equal(new Set(codes).size, 10);
  assert.match(codes[0] ?? "", /^[A-F0-9]{4}(?:-[A-F0-9]{4}){3}$/);
  assert.equal(findRecoveryCodeHash(codes[0] ?? "", hashes), hashes[0]);
  assert.equal(findRecoveryCodeHash("AAAA-BBBB-CCCC-DDDD", hashes), null);
});

test("accepts TOTP or recovery credential without exposing the secret", () => {
  const secret = "JBSWY3DPEHPK3PXP";
  const now = 1_700_000_000_000;
  const totpCode = createTotpCode(secret, Math.floor(now / 30_000));
  const recoveryCode = "AAAA-BBBB-CCCC-DDDD";
  const recoveryHash = hashRecoveryCode(recoveryCode);

  assert.deepEqual(verifyMfaCredential(secret, totpCode, [], now), {
    kind: "totp",
    timeStep: Math.floor(now / 30_000),
  });
  assert.deepEqual(
    verifyMfaCredential(secret, recoveryCode, [recoveryHash], now),
    { kind: "recovery", recoveryHash },
  );
});

test("builds a standards-compatible provisioning URI", () => {
  const uri = buildMfaProvisioningUri(
    "Admin@CandyEnglish.com.br",
    "JBSWY3DPEHPK3PXP",
  );

  assert.match(uri, /^otpauth:\/\/totp\//);
  assert.match(uri, /secret=JBSWY3DPEHPK3PXP/);
  assert.match(uri, /issuer=Candy%20English/);
  assert.doesNotMatch(uri, /Admin@/);
});
