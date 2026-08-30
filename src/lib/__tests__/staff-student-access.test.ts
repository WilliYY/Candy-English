import assert from "node:assert/strict";
import test from "node:test";

import {
  getActiveStudentProfileWhere,
  getStaffStudentSelectionWhere,
} from "@/lib/staff-student-access";

test("Admin e Teacher selecionam qualquer aluno ativo sem filtro de vinculo", () => {
  assert.deepEqual(getStaffStudentSelectionWhere(), {
    user: {
      deletedAt: null,
      isActive: true,
      role: "STUDENT",
    },
  });

  assert.deepEqual(getStaffStudentSelectionWhere("IVATE"), {
    unit: "IVATE",
    user: {
      deletedAt: null,
      isActive: true,
      role: "STUDENT",
    },
  });
});

test("validacao individual aceita somente perfil de aluno ativo e nao excluido", () => {
  assert.deepEqual(getActiveStudentProfileWhere("student-1"), {
    id: "student-1",
    user: {
      deletedAt: null,
      isActive: true,
      role: "STUDENT",
    },
  });
});
