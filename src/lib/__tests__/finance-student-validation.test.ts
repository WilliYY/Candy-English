import assert from "node:assert/strict";
import test from "node:test";
import { adminFinanceStudentCreateSchema } from "../validations/admin-users";

const validFinancialStudent = {
  address: "",
  amount: "300,00",
  cpf: "",
  email: "aluno@candy.local",
  initialPassword: "alunocandy",
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
    initialPassword: "",
    studentProfileId: "student-profile-1",
  });

  assert.equal(result.success, true);

  if (result.success) {
    assert.equal(result.data.studentProfileId, "student-profile-1");
  }
});

test("creates a new AVA login when no student profile is selected", () => {
  const result = adminFinanceStudentCreateSchema.safeParse({
    ...validFinancialStudent,
    studentProfileId: "",
  });

  assert.equal(result.success, true);

  if (result.success) {
    assert.equal(result.data.studentProfileId, undefined);
    assert.equal(result.data.email, "aluno@candy.local");
    assert.equal(result.data.initialPassword, "alunocandy");
  }
});

test("requires a login and initial password for a new student", () => {
  const result = adminFinanceStudentCreateSchema.safeParse({
    ...validFinancialStudent,
    email: "",
    initialPassword: "curta",
    studentProfileId: "",
  });

  assert.equal(result.success, false);

  if (!result.success) {
    const paths = result.error.issues.map((issue) => issue.path[0]);
    assert.ok(paths.includes("email"));
    assert.ok(paths.includes("initialPassword"));
  }
});
