import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizeTeacherFinanceMonth,
  projectTeacherFinanceRow,
  type TeacherFinanceStudentSource,
} from "../teacher-finance";

function buildStudent(
  overrides: Partial<TeacherFinanceStudentSource> = {},
): TeacherFinanceStudentSource {
  return {
    financialStudent: {
      payments: [
        {
          isActive: true,
          isPaid: false,
          month: 8,
          paidAt: null,
          snapshotAmountCents: 30_000,
          snapshotName: "Ana Snapshot",
          snapshotPaymentDay: 10,
          snapshotPaymentMethod: "PIX",
          snapshotUnit: "DOURADINA",
          year: 2026,
        },
      ],
    },
    id: "student-1",
    unit: "IVATE",
    user: { name: "Ana Atual" },
    ...overrides,
  };
}

test("projeta apenas dados permitidos e preserva o polo do snapshot", () => {
  const row = projectTeacherFinanceRow(
    buildStudent(),
    new Date("2026-08-24T15:00:00.000Z"),
  );

  assert.deepEqual(Object.keys(row).sort(), [
    "id",
    "name",
    "paidAt",
    "paymentDay",
    "status",
    "unit",
  ]);
  assert.equal(row.name, "Ana Snapshot");
  assert.equal(row.unit, "DOURADINA");
  assert.equal(row.status, "OVERDUE");
  assert.equal("snapshotAmountCents" in row, false);
  assert.equal("paymentMethod" in row, false);
  assert.equal("phone" in row, false);
  assert.equal("email" in row, false);
});

test("distingue pago, pendente, inativo e cadastro incompleto", () => {
  const now = new Date("2026-08-24T15:00:00.000Z");
  const paidStudent = buildStudent();
  paidStudent.financialStudent!.payments[0].isPaid = true;
  paidStudent.financialStudent!.payments[0].paidAt = new Date(
    "2026-08-12T12:00:00.000Z",
  );
  assert.equal(projectTeacherFinanceRow(paidStudent, now).status, "PAID");

  const pendingStudent = buildStudent();
  pendingStudent.financialStudent!.payments[0].snapshotPaymentDay = 30;
  assert.equal(projectTeacherFinanceRow(pendingStudent, now).status, "PENDING");

  const inactiveStudent = buildStudent();
  inactiveStudent.financialStudent!.payments[0].isActive = false;
  assert.equal(projectTeacherFinanceRow(inactiveStudent, now).status, "INACTIVE");

  const incompleteStudent = buildStudent({ financialStudent: null });
  assert.equal(
    projectTeacherFinanceRow(incompleteStudent, now).status,
    "INCOMPLETE",
  );
});

test("normaliza somente meses validos", () => {
  assert.equal(normalizeTeacherFinanceMonth("2", 8), 2);
  assert.equal(normalizeTeacherFinanceMonth(["12"], 8), 12);
  assert.equal(normalizeTeacherFinanceMonth("13", 8), 8);
  assert.equal(normalizeTeacherFinanceMonth(undefined, 8), 8);
});
