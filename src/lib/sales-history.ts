export type SalesHistoryStatusFilter = "ALL" | "COMPLETED" | "CANCELED";

type SearchableSale = {
  buyerNameSnapshot: string;
  items: readonly { productNameSnapshot: string }[];
  sellerName: string;
  status: "COMPLETED" | "CANCELED";
};

type SalesHistoryFilters = {
  query: string;
  status: SalesHistoryStatusFilter;
};

function normalizeHistorySearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .trim();
}

export function filterSalesHistory<TSale extends SearchableSale>(
  sales: readonly TSale[],
  filters: SalesHistoryFilters,
) {
  const query = normalizeHistorySearch(filters.query);

  return sales.filter((sale) => {
    if (filters.status !== "ALL" && sale.status !== filters.status) {
      return false;
    }

    if (!query) {
      return true;
    }

    const searchableText = normalizeHistorySearch(
      [
        sale.buyerNameSnapshot,
        sale.sellerName,
        ...sale.items.map((item) => item.productNameSnapshot),
      ].join(" "),
    );

    return searchableText.includes(query);
  });
}
