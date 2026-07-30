import assert from "node:assert/strict";
import test from "node:test";

import { toMobileStudentProfile } from "@/lib/profile-service";
import { detectAvatarMimeType } from "@/lib/storage";
import { updateProfileSchema } from "@/lib/validations/ava-operations";

test("detects supported avatar signatures and rejects disguised content", () => {
  assert.equal(
    detectAvatarMimeType(
      Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]),
    ),
    "image/jpeg",
  );
  assert.equal(
    detectAvatarMimeType(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    ),
    "image/png",
  );
  assert.equal(
    detectAvatarMimeType(Buffer.from("RIFF1234WEBP", "ascii")),
    "image/webp",
  );
  assert.equal(detectAvatarMimeType(Buffer.from("<script>alert(1)</script>")), null);
});

test("normalizes the student profile without exposing the storage path", () => {
  const profile = toMobileStudentProfile({
    address: "Rua Candy, 10",
    avatarPath: "avatars/private-file.jpg",
    email: "student@example.com",
    name: "Candy Student",
    phone: "44999999999",
    studentProfile: {
      birthDate: new Date("2010-05-20T00:00:00.000Z"),
      gender: "Feminino",
      guardianDocument: "Responsavel",
      level: "A2",
      motherName: "Maria",
      motherPhone: "44888888888",
      notes: "Observacao",
      studentPhone: "44777777777",
      studentPhoneAlt: null,
    },
  });

  assert.equal(profile.birthDate, "2010-05-20");
  assert.equal(profile.hasAvatar, true);
  assert.match(profile.avatarRevision ?? "", /^[a-f0-9]{16}$/);
  assert.equal("avatarPath" in profile, false);
});

test("accepts only an exact calendar birth date", () => {
  assert.equal(
    updateProfileSchema.safeParse({
      birthDate: "2010-05-20",
      name: "Candy Student",
    }).success,
    true,
  );
  assert.equal(
    updateProfileSchema.safeParse({
      birthDate: "2010-02-31",
      name: "Candy Student",
    }).success,
    false,
  );
  assert.equal(
    updateProfileSchema.safeParse({
      birthDate: "20/05/2010",
      name: "Candy Student",
    }).success,
    false,
  );
});
