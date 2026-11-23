-- Only defaults for future inserts change; existing years and balances remain intact.
-- Explicit year values sent by existing web/mobile clients continue to take precedence.
ALTER TABLE "FinancialPayment" ALTER COLUMN "year"
  SET DEFAULT ((EXTRACT(year FROM (CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo')))::integer);
ALTER TABLE "FinancialExpense" ALTER COLUMN "year"
  SET DEFAULT ((EXTRACT(year FROM (CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo')))::integer);
ALTER TABLE "AgendaLesson" ALTER COLUMN "year"
  SET DEFAULT ((EXTRACT(year FROM (CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo')))::integer);
