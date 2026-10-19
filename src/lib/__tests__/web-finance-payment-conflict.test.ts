import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

import { hasCompleteFinancialRegistration } from "../financial-completeness";
import { adminFinancePaymentUpdateSchema } from "../validations/admin-users";

const version = "2026-10-19T10:00:00.000Z";
const source = readFileSync(new URL("../../app/ava/admin/actions.ts", import.meta.url), "utf8");
const actionSource = source.slice(
  source.indexOf("export async function updateFinancialPaymentDetails("),
  source.indexOf("export async function toggleFinancialPaymentStatus("),
);

function fixture(options: { stale?: boolean; race?: boolean; missing?: boolean } = {}) {
  const student = { id: "student-1", name: "Aluno teste", amountCents: 30000, paymentDay: 10, paymentMethod: "PIX", installmentsTotal: null };
  let row = options.missing ? null : {
    id: "payment-1", isPaid: false, snapshotAmountCents: 30000,
    snapshotPaymentDay: 10, snapshotPaymentMethod: "PIX", note: "original",
    updatedAt: new Date(options.stale ? "2026-10-19T11:00:00.000Z" : version),
  };
  let logs = 0;
  const financialPayment = {
    findUnique: async () => row,
    findUniqueOrThrow: async () => {
      assert.ok(row);
      return row;
    },
    upsert: async ({ update }: { update: Record<string, unknown> }) => {
      row = { ...row!, ...update }; return row;
    },
    updateMany: async ({ where, data }: { where: { updatedAt: Date }; data: Record<string, unknown> }) => {
      if (options.race) row = { ...row!, note: "app mais recente", updatedAt: new Date("2026-10-19T12:00:00.000Z") };
      if (!row || row.updatedAt.getTime() !== where.updatedAt.getTime()) return { count: 0 };
      row = { ...row, ...data, updatedAt: new Date(row.updatedAt.getTime() + 1) }; return { count: 1 };
    },
  };
  const store = {
    financialStudent: { findUnique: async () => student }, financialPayment,
    $transaction: async (callback: (tx: unknown) => unknown) => callback({
      financialPayment, financialLog: { create: async () => { logs++; } },
    }),
  };
  const context = {
    exports: {}, requireAdmin: async () => ({ user: { id: "admin-1" } }),
    adminFinancePaymentUpdateSchema, getPrisma: () => store,
    hasCompleteFinancialRegistration, revalidatePath: () => {},
    buildFinancialPaymentSnapshot: () => ({}), getFinancialInstallmentNumber: () => null,
    fieldErrors: () => ({}), Date,
  };
  const js = ts.transpileModule(actionSource, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  runInNewContext(js, context);
  const action = (context.exports as { updateFinancialPaymentDetails: (input: unknown) => Promise<{ ok: boolean; updatedAt?: string }> }).updateFinancialPaymentDetails;
  return { action, row: () => row, logs: () => logs };
}

const input = { amount: "350,00", expectedUpdatedAt: version, month: 10, note: "edicao web", paidAt: "", studentId: "student-1", year: 2026 };

test("web rejects a payment edited by the app after the form opened", async () => {
  const state = fixture({ stale: true });
  assert.equal((await state.action(input)).ok, false);
  assert.equal(state.row()?.snapshotAmountCents, 30000);
  assert.equal(state.row()?.note, "original");
  assert.equal(state.logs(), 0);
});

test("web rejects an app edit racing between read and write", async () => {
  const state = fixture({ race: true });
  assert.equal((await state.action(input)).ok, false);
  assert.equal(state.row()?.note, "app mais recente");
  assert.equal(state.logs(), 0);
});

test("web saves the current payment and records one audit entry", async () => {
  const state = fixture();
  assert.equal((await state.action(input)).ok, true);
  assert.equal(state.row()?.snapshotAmountCents, 35000);
  assert.equal(state.row()?.note, "edicao web");
  assert.equal(state.row()?.isPaid, false);
  assert.equal(state.logs(), 1);
});

test("web requires a valid loaded version", async () => {
  const state = fixture();
  assert.equal((await state.action({ ...input, expectedUpdatedAt: undefined })).ok, false);
  assert.equal((await state.action({ ...input, expectedUpdatedAt: "invalid" })).ok, false);
  assert.equal(state.logs(), 0);
});

test("web does not recreate a payment removed after the form opened", async () => {
  const state = fixture({ missing: true });
  assert.equal((await state.action(input)).ok, false);
  assert.equal(state.row(), null);
  assert.equal(state.logs(), 0);
});

function formHarness(action: ReturnType<typeof fixture>["action"]) {
  const panel = readFileSync(new URL("../../components/ava/admin-finance-panel.tsx", import.meta.url), "utf8");
  const start = panel.indexOf("function FinancePaymentDetailForm(");
  const body = panel.slice(start, panel.indexOf("  return (", start)) + "  return onSubmit;\n}";
  let values: Record<string, unknown> | undefined;
  let pending: Promise<unknown> = Promise.resolve();
  const context = {
    useRouter: () => ({ refresh: () => {} }),
    useState: () => [null, () => {}],
    useTransition: () => [false, (callback: () => Promise<unknown>) => { pending = callback(); }],
    useForm: ({ defaultValues }: { defaultValues: Record<string, unknown> }) => {
      values ??= { ...defaultValues };
      return {
        handleSubmit: (callback: (input: unknown) => void) => () => callback({ ...values }),
        setValue: (key: string, value: unknown) => { values![key] = value; },
        setError: () => {},
      };
    },
    zodResolver: () => undefined, adminFinancePaymentUpdateSchema,
    formatAmountInput: () => "300,00", toInputDate: () => "",
    updateFinancialPaymentDetails: action,
  };
  runInNewContext(ts.transpileModule(body, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, context);
  const render = (updatedAt: string) => (context as unknown as {
    FinancePaymentDetailForm: (props: unknown) => () => void;
  }).FinancePaymentDetailForm({ studentId: input.studentId, payment: { updatedAt, month: input.month, note: "original" } });
  return {
    render,
    edit: (note: string) => { values!.note = note; },
    values: () => values!,
    save: async (submit: () => void) => { submit(); await pending; },
  };
}

test("web form saves twice using the version confirmed by its previous transaction", async () => {
  const state = fixture();
  const form = formHarness(state.action);
  let submit = form.render(version);
  form.edit("primeiro rascunho");
  await form.save(submit);
  assert.equal(form.values().expectedUpdatedAt, state.row()!.updatedAt.toISOString());
  assert.notEqual(form.values().expectedUpdatedAt, version);
  submit = form.render(state.row()!.updatedAt.toISOString());
  form.edit("segundo rascunho");
  await form.save(submit);
  assert.equal(state.row()?.note, "segundo rascunho");
  assert.equal(state.logs(), 2);
});

test("web form preserves draft and loaded version when refreshed after an external edit", async () => {
  const state = fixture({ stale: true });
  const form = formHarness(state.action);
  form.render(version);
  form.edit("nao apagar meu rascunho");
  const submit = form.render(state.row()!.updatedAt.toISOString());
  assert.equal(form.values().note, "nao apagar meu rascunho");
  assert.equal(form.values().expectedUpdatedAt, version);
  await form.save(submit);
  assert.equal(form.values().note, "nao apagar meu rascunho");
  assert.equal(state.row()?.note, "original");
  assert.equal(state.logs(), 0);
});
