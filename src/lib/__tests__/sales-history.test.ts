import assert from "node:assert/strict";
import test from "node:test";

import { filterSalesHistory } from "@/lib/sales-history";

const sales = [
  {
    buyerNameSnapshot: "João da Silva",
    id: "sale-completed",
    items: [{ productNameSnapshot: "Caderno Candy" }],
    sellerName: "Teacher Ana",
    status: "COMPLETED" as const,
  },
  {
    buyerNameSnapshot: "Maria Souza",
    id: "sale-canceled",
    items: [{ productNameSnapshot: "Caneca Rosa" }],
    sellerName: "Admin Candy",
    status: "CANCELED" as const,
  },
];

test("finds recent sales by buyer, seller or product without accent sensitivity", () => {
  assert.deepEqual(
    filterSalesHistory(sales, { query: "joao", status: "ALL" }).map(
      (sale) => sale.id,
    ),
    ["sale-completed"],
  );
  assert.deepEqual(
    filterSalesHistory(sales, { query: "teacher", status: "ALL" }).map(
      (sale) => sale.id,
    ),
    ["sale-completed"],
  );
  assert.deepEqual(
    filterSalesHistory(sales, { query: "caneca", status: "ALL" }).map(
      (sale) => sale.id,
    ),
    ["sale-canceled"],
  );
});

test("filters the quick history by completed or refunded sale", () => {
  assert.deepEqual(
    filterSalesHistory(sales, { query: "", status: "COMPLETED" }).map(
      (sale) => sale.id,
    ),
    ["sale-completed"],
  );
  assert.deepEqual(
    filterSalesHistory(sales, { query: "", status: "CANCELED" }).map(
      (sale) => sale.id,
    ),
    ["sale-canceled"],
  );
});
