import assert from "node:assert/strict";
import test from "node:test";
import { secretariaStudentRegistrationSchema } from "@/lib/validations/pre-registration";

const validInput = {
  email: "Aluno@Candy.Local",
  englishGoal: "Aprender ingles para conversar com seguranca.",
  fullName: "Aluno Candy",
  initialPassword: "alunocandy",
  initialPasswordConfirmation: "alunocandy",
  intendedWeekdayMask: 0,
  phone: "(44) 99999-9999",
  unit: "IVATE" as const,
};

test("cadastro unico exige login valido e normaliza o email", () => {
  const result = secretariaStudentRegistrationSchema.safeParse(validInput);

  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.data.email, "aluno@candy.local");
  }
});

test("cadastro unico bloqueia senha curta", () => {
  const result = secretariaStudentRegistrationSchema.safeParse({
    ...validInput,
    initialPassword: "candy",
    initialPasswordConfirmation: "candy",
  });

  assert.equal(result.success, false);
  if (!result.success) {
    assert.equal(
      result.error.issues.some((issue) => issue.path[0] === "initialPassword"),
      true,
    );
  }
});

test("cadastro unico exige confirmacao igual a senha", () => {
  const result = secretariaStudentRegistrationSchema.safeParse({
    ...validInput,
    initialPasswordConfirmation: "outrasenha",
  });

  assert.equal(result.success, false);
  if (!result.success) {
    assert.equal(
      result.error.issues.some(
        (issue) => issue.path[0] === "initialPasswordConfirmation",
      ),
      true,
    );
  }
});
