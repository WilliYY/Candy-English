import assert from "node:assert/strict";
import {
  isOpenPreRegistrationStatus,
  OPEN_PRE_REGISTRATION_STATUSES,
} from "../src/lib/pre-registration-queue";
import { secretariaPreRegistrationUpdateSchema } from "../src/lib/validations/pre-registration";

for (const status of OPEN_PRE_REGISTRATION_STATUSES) {
  assert.equal(
    isOpenPreRegistrationStatus(status),
    true,
    `${status} deve permanecer na fila Novo`,
  );
}

assert.equal(isOpenPreRegistrationStatus("APPROVED"), false);
assert.equal(isOpenPreRegistrationStatus("REJECTED"), false);

const validUpdate = secretariaPreRegistrationUpdateSchema.safeParse({
  assignedTeacherProfileId: "",
  birthDate: "",
  city: "Ivate",
  email: "aluno@example.com",
  englishGoal: "Conversacao para o trabalho",
  estimatedLevel: "Iniciante",
  fullName: "Aluno Teste",
  guardianName: "",
  installmentsTotal: "2",
  intendedTime: "14:00",
  intendedWeekdayMask: 4,
  notes: "Contato realizado pela Secretaria.",
  paymentDay: "5",
  paymentMethod: "PIX",
  phone: "(44) 99999-9999",
  requestId: "pre-registration-test",
  tuitionAmount: "300,00",
  unit: "IVATE",
});

assert.equal(validUpdate.success, true);
assert.equal(
  secretariaPreRegistrationUpdateSchema.safeParse({
    ...validUpdate.data,
    requestId: "",
  }).success,
  false,
);

console.log("Pre-registration smoke: OK");
