import assert from "node:assert/strict";
import {
  isOpenPreRegistrationStatus,
  OPEN_PRE_REGISTRATION_STATUSES,
} from "../src/lib/pre-registration-queue";
import {
  INCOMPLETE_FINANCIAL_PAYMENT_DAY,
  INCOMPLETE_FINANCIAL_PAYMENT_METHOD,
  hasCompleteFinancialRegistration,
  resolveFinancialRegistration,
} from "../src/lib/financial-completeness";
import {
  preRegistrationAcceptSchema,
  secretariaPreRegistrationUpdateSchema,
} from "../src/lib/validations/pre-registration";

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

assert.equal(
  preRegistrationAcceptSchema.safeParse({
    cattyContext: "",
    confirmConversion: true,
    confirmMissingAgendaData: false,
    emailForLogin: "aluno@example.com",
    initialPassword: "alunocandy",
    requestId: "pre-registration-test",
    teacherProfileIdForConversion: "",
  }).success,
  true,
);

const incompleteFinancialRegistration = resolveFinancialRegistration({
  amountCents: null,
  paymentDay: null,
  paymentMethod: null,
});

assert.deepEqual(incompleteFinancialRegistration, {
  amountCents: 0,
  isComplete: false,
  paymentDay: INCOMPLETE_FINANCIAL_PAYMENT_DAY,
  paymentMethod: INCOMPLETE_FINANCIAL_PAYMENT_METHOD,
});
assert.equal(
  hasCompleteFinancialRegistration(incompleteFinancialRegistration),
  false,
);
assert.deepEqual(
  resolveFinancialRegistration({
    amountCents: 30000,
    paymentDay: null,
    paymentMethod: "PIX",
  }),
  {
    amountCents: 30000,
    isComplete: false,
    paymentDay: INCOMPLETE_FINANCIAL_PAYMENT_DAY,
    paymentMethod: INCOMPLETE_FINANCIAL_PAYMENT_METHOD,
  },
);
assert.equal(
  hasCompleteFinancialRegistration({
    amountCents: 30000,
    paymentDay: 5,
    paymentMethod: "PIX",
  }),
  true,
);

console.log("Pre-registration smoke: OK");
