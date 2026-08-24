import assert from "node:assert/strict";
import test from "node:test";
import { adminFinanceStudentCreateSchema } from "../validations/admin-users";

const validFinancialStudent = {
  address: "",
  amount: "300,00",
  cpf: "",
  email: "aluno@candy.local",
  installmentsTotal: "",
  month: 8,
  name: "Aluno Candy",
  note: "",
  paidAt: "",
  paymentDay: 5,
  paymentMethod: "PIX" as const,
  phone: "44999999999",
  unit: "IVATE" as const,
  year: 2026 as const,
};

test("keeps the selected AVA student link in a financial registration", () => {
  const result = adminFinanceStudentCreateSchema.safeParse({
    ...validFinancialStudent,
    studentProfileId: "student-profile-1",
  });

  assert.equal(result.success, true);

  if (result.success) {
    assert.equal(result.data.studentProfileId, "student-profile-1");
  }
});

test("allows a manual financial registration without an AVA student", () => {
  const result = adminFinanceStudentCreateSchema.safeParse({
    ...validFinancialStudent,
    email: "",
    studentProfileId: "",
  });

  assert.equal(result.success, true);

  if (result.success) {
    assert.equal(result.data.studentProfileId, undefined);
  }
});
