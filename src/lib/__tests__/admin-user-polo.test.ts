import assert from "node:assert/strict";
import test from "node:test";

import { getAdminUserPoloScope } from "../admin-user-polo";

test("admin tem acesso identificado a todos os polos", () => {
  assert.deepEqual(
    getAdminUserPoloScope({ role: "ADMIN" }),
    {
      label: "Todos os polos",
      tone: "all",
      units: ["IVATE", "DOURADINA"],
    },
  );
});

test("aluno mostra o polo cadastrado", () => {
  assert.deepEqual(
    getAdminUserPoloScope({ role: "STUDENT", studentUnit: "IVATE" }),
    {
      label: "Polo 1 · Ivaté",
      tone: "ivate",
      units: ["IVATE"],
    },
  );
});

test("teacher reúne os polos dos alunos vinculados sem duplicar", () => {
  assert.deepEqual(
    getAdminUserPoloScope({
      role: "TEACHER",
      teacherStudentUnits: ["DOURADINA", "IVATE", "DOURADINA"],
    }),
    {
      label: "Ivaté + Douradina",
      tone: "multiple",
      units: ["IVATE", "DOURADINA"],
    },
  );
});

test("teacher sem aluno vinculado não recebe um polo inventado", () => {
  assert.deepEqual(
    getAdminUserPoloScope({ role: "TEACHER", teacherStudentUnits: [] }),
    {
      label: "Sem polo vinculado",
      tone: "none",
      units: [],
    },
  );
});
