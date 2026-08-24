"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArchiveRestore,
  BadgeDollarSign,
  Boxes,
  Check,
  ChevronDown,
  CircleDollarSign,
  CreditCard,
  Minus,
  PackagePlus,
  Pencil,
  Plus,
  ReceiptText,
  Search,
  ShoppingBag,
  ShoppingCart,
  Trash2,
  UserRound,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import {
  cancelSale,
  createSale,
  createSaleProduct,
  updateSaleProduct,
} from "@/app/ava/vendas/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import {
  SALE_PAYMENT_METHODS,
  saleProductCreateSchema,
  type SaleProductCreateInput,
} from "@/lib/validations/sales";
import { cn } from "@/lib/utils";

type FinancialUnit = "IVATE" | "DOURADINA";
type SettlementType = "PAID_NOW" | "MONTHLY_INVOICE";
type PaymentMethod = (typeof SALE_PAYMENT_METHODS)[number];

type ProductRow = {
  costCents: number;
  id: string;
  isActive: boolean;
  name: string;
  salePriceCents: number;
  stockQuantity: number;
  updatedAt: string;
};

type StudentOption = {
  canInvoice: boolean;
  email: string;
  id: string;
  name: string;
  unit: FinancialUnit;
};

type SaleRow = {
  buyerNameSnapshot: string;
  canceledAt: string | null;
  cancelReason: string | null;
  costTotalCents: number;
  createdAt: string;
  id: string;
  invoiceMonth: number | null;
  invoiceYear: number | null;
  items: {
    id: string;
    lineTotalCents: number;
    productNameSnapshot: string;
    quantity: number;
    unitSalePriceCents: number;
  }[];
  paidAt: string | null;
  paymentMethod: string | null;
  sellerName: string;
  settlementType: SettlementType;
  soldByUserId: string | null;
  status: "COMPLETED" | "CANCELED";
  totalCents: number;
  unit: FinancialUnit;
};

type CartItem = ProductRow & { quantity: number };

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  currency: "BRL",
  style: "currency",
});

const dateTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

const paymentMethodLabels: Record<string, string> = {
  CASH: "Dinheiro",
  CREDIT_CARD: "Cartao de credito",
  DEBIT_CARD: "Cartao de debito",
  OTHER: "Outro",
  PIX: "Pix",
};

const monthLabels = [
  "",
  "Janeiro",
  "Fevereiro",
  "Marco",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

function formatCurrency(cents: number) {
  return currencyFormatter.format(cents / 100);
}

function formatUnit(unit: FinancialUnit) {
  return unit === "IVATE" ? "Polo 1 - Ivate" : "Polo 2 - Douradina";
}

function moneyToCents(value: unknown) {
  const amount = Number(String(value).replace(",", "."));
  return Number.isFinite(amount) ? Math.round(amount * 100) : Number.NaN;
}

function ProductEditor({ product }: { product: ProductRow }) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setMessage(null);
    startTransition(async () => {
      const result = await updateSaleProduct({
        costCents: moneyToCents(formData.get("cost")),
        expectedUpdatedAt: product.updatedAt,
        isActive: formData.get("isActive") === "true",
        name: String(formData.get("name") ?? ""),
        productId: product.id,
        salePriceCents: moneyToCents(formData.get("price")),
        stockQuantity: Number(formData.get("stock")),
      });
      setMessage(result.message);
      if (result.ok) router.refresh();
    });
  }

  return (
    <details className="group mt-3 border-t border-primary/10 pt-3">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-xs font-bold text-primary [&::-webkit-details-marker]:hidden">
        <span className="inline-flex items-center gap-1.5">
          <Pencil aria-hidden="true" className="size-3.5" />
          Editar produto e estoque
        </span>
        <ChevronDown aria-hidden="true" className="size-4 transition-transform group-open:rotate-180" />
      </summary>
      <form action={handleSubmit} className="mt-3 grid gap-2" onClick={(event) => event.stopPropagation()}>
        <Input aria-label="Nome do produto" defaultValue={product.name} name="name" required />
        <div className="grid gap-2 sm:grid-cols-3">
          <Input aria-label="Custo" defaultValue={(product.costCents / 100).toFixed(2)} min="0" name="cost" step="0.01" type="number" required />
          <Input aria-label="Venda" defaultValue={(product.salePriceCents / 100).toFixed(2)} min="0.01" name="price" step="0.01" type="number" required />
          <Input aria-label="Estoque" defaultValue={product.stockQuantity} min="0" name="stock" type="number" required />
        </div>
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <NativeSelect aria-label="Situacao do produto" defaultValue={String(product.isActive)} name="isActive">
            <option value="true">Ativo</option>
            <option value="false">Arquivado</option>
          </NativeSelect>
          <Button disabled={isPending} size="sm" type="submit">
            <Check aria-hidden="true" />
            {isPending ? "Salvando" : "Salvar"}
          </Button>
        </div>
        {message ? <p aria-live="polite" className="text-xs font-semibold text-primary" role="status">{message}</p> : null}
      </form>
    </details>
  );
}

function RecentSaleCard({ actorId, isAdmin, sale }: { actorId: string; isAdmin: boolean; sale: SaleRow }) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const canCancel = sale.status === "COMPLETED" && (isAdmin || sale.soldByUserId === actorId);

  function handleCancel() {
    startTransition(async () => {
      const result = await cancelSale({ reason, saleId: sale.id });
      setMessage(result.message);
      if (result.ok) {
        setReason("");
        router.refresh();
      }
    });
  }

  return (
    <article className={cn("overflow-hidden rounded-lg border bg-white shadow-sm", sale.status === "CANCELED" ? "border-slate-200 opacity-70" : sale.settlementType === "MONTHLY_INVOICE" ? "border-amber-200" : "border-emerald-200")}>
      <div className="grid gap-3 p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <strong className="truncate text-sm text-primary">{sale.buyerNameSnapshot}</strong>
            <span className={cn("rounded-full border px-2 py-0.5 text-[0.65rem] font-extrabold uppercase", sale.status === "CANCELED" ? "border-slate-200 bg-slate-50 text-slate-600" : sale.settlementType === "MONTHLY_INVOICE" ? "border-amber-200 bg-amber-50 text-amber-900" : "border-emerald-200 bg-emerald-50 text-emerald-800")}>
              {sale.status === "CANCELED" ? "Cancelada" : sale.settlementType === "MONTHLY_INVOICE" ? "Na fatura" : "Pago agora"}
            </span>
            <span className="rounded-full border border-primary/10 bg-primary/[0.04] px-2 py-0.5 text-[0.65rem] font-bold text-primary/70">{formatUnit(sale.unit)}</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{dateTimeFormatter.format(new Date(sale.createdAt))} por {sale.sellerName}</p>
        </div>
        <strong className="text-lg tabular-nums text-primary">{formatCurrency(sale.totalCents)}</strong>
      </div>
      <details className="group border-t border-primary/10 bg-[#fbf9fc]">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-xs font-bold text-primary [&::-webkit-details-marker]:hidden">
          <span>{sale.items.length} produto(s)</span>
          <ChevronDown aria-hidden="true" className="size-4 transition-transform group-open:rotate-180" />
        </summary>
        <div className="grid gap-2 border-t border-primary/10 p-3">
          {sale.items.map((item) => (
            <div className="flex items-center justify-between gap-3 text-xs" key={item.id}>
              <span className="min-w-0 truncate">{item.quantity}x {item.productNameSnapshot}</span>
              <strong className="shrink-0 tabular-nums">{formatCurrency(item.lineTotalCents)}</strong>
            </div>
          ))}
          <p className="text-xs text-muted-foreground">
            {sale.settlementType === "MONTHLY_INVOICE" && sale.invoiceMonth
              ? `Fatura de ${monthLabels[sale.invoiceMonth]} de ${sale.invoiceYear}`
              : paymentMethodLabels[sale.paymentMethod ?? ""] ?? "Pagamento registrado"}
          </p>
          {sale.status === "CANCELED" ? <p className="rounded-md bg-slate-100 px-2 py-1.5 text-xs text-slate-600">Motivo: {sale.cancelReason}</p> : null}
          {canCancel ? (
            <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
              <Input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Motivo do cancelamento" />
              <Button disabled={isPending || reason.trim().length < 3} onClick={handleCancel} size="sm" type="button" variant="outline">
                <ArchiveRestore aria-hidden="true" />
                Cancelar venda
              </Button>
            </div>
          ) : null}
          {message ? <p className="text-xs font-semibold text-primary">{message}</p> : null}
        </div>
      </details>
    </article>
  );
}

export function SalesPosPanel({
  actor,
  currentPeriod,
  products,
  recentSales,
  students,
}: {
  actor: { id: string; isAdmin: boolean; name: string };
  currentPeriod: { month: number; year: number };
  products: ProductRow[];
  recentSales: SaleRow[];
  students: StudentOption[];
}) {
  const router = useRouter();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [isProductFormOpen, setIsProductFormOpen] = useState(false);
  const [studentSearch, setStudentSearch] = useState("");
  const [studentProfileId, setStudentProfileId] = useState("");
  const [buyerName, setBuyerName] = useState("");
  const [settlementType, setSettlementType] = useState<SettlementType>("PAID_NOW");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("PIX");
  const [unit, setUnit] = useState<FinancialUnit>("IVATE");
  const [note, setNote] = useState("");
  const [checkoutMessage, setCheckoutMessage] = useState<string | null>(null);
  const [productMessage, setProductMessage] = useState<string | null>(null);
  const [operationId, setOperationId] = useState(() => crypto.randomUUID());
  const [isCheckoutPending, startCheckoutTransition] = useTransition();
  const [isProductPending, startProductTransition] = useTransition();
  const productForm = useForm<SaleProductCreateInput>({
    resolver: zodResolver(saleProductCreateSchema, undefined, { raw: true }),
    defaultValues: { costCents: 0, name: "", salePriceCents: 0, stockQuantity: 0 },
  });

  const activeProducts = useMemo(() => {
    const search = productSearch.trim().toLocaleLowerCase("pt-BR");
    return products.filter((product) => product.isActive && (!search || product.name.toLocaleLowerCase("pt-BR").includes(search)));
  }, [productSearch, products]);
  const filteredStudents = useMemo(() => {
    const search = studentSearch.trim().toLocaleLowerCase("pt-BR");
    return students.filter((student) => !search || `${student.name} ${student.email}`.toLocaleLowerCase("pt-BR").includes(search));
  }, [studentSearch, students]);
  const selectedStudent = students.find((student) => student.id === studentProfileId) ?? null;
  const cartTotal = cart.reduce((total, item) => total + item.salePriceCents * item.quantity, 0);
  const stockUnits = products.reduce((total, product) => total + (product.isActive ? product.stockQuantity : 0), 0);
  const invoiceReady = settlementType !== "MONTHLY_INVOICE" || Boolean(selectedStudent?.canInvoice);
  const buyerReady = Boolean(selectedStudent || buyerName.trim());

  function addToCart(product: ProductRow) {
    if (!product.isActive || product.stockQuantity < 1) return;
    setCart((current) => {
      const existing = current.find((item) => item.id === product.id);
      if (existing) {
        return current.map((item) => item.id === product.id ? { ...item, quantity: Math.min(item.quantity + 1, product.stockQuantity) } : item);
      }
      return [...current, { ...product, quantity: 1 }];
    });
  }

  function changeQuantity(productId: string, delta: number) {
    setCart((current) => current.flatMap((item) => {
      if (item.id !== productId) return [item];
      const quantity = Math.min(item.stockQuantity, item.quantity + delta);
      return quantity > 0 ? [{ ...item, quantity }] : [];
    }));
  }

  const submitProduct = productForm.handleSubmit((values) => {
    setProductMessage(null);
    startProductTransition(async () => {
      const result = await createSaleProduct(values);
      setProductMessage(result.message);
      if (!result.ok) {
        if (result.errors) {
          Object.entries(result.errors).forEach(([field, message]) => {
            if (message) productForm.setError(field as keyof SaleProductCreateInput, { message });
          });
        }
        return;
      }
      productForm.reset();
      router.refresh();
    });
  });

  function submitCheckout() {
    setCheckoutMessage(null);
    startCheckoutTransition(async () => {
      const result = await createSale({
        buyerName,
        items: cart.map((item) => ({
          expectedSalePriceCents: item.salePriceCents,
          expectedUpdatedAt: item.updatedAt,
          productId: item.id,
          quantity: item.quantity,
        })),
        note,
        operationId,
        paymentMethod: settlementType === "PAID_NOW" ? paymentMethod : null,
        settlementType,
        studentProfileId: selectedStudent?.id ?? null,
        unit: selectedStudent?.unit ?? unit,
      });
      setCheckoutMessage(result.message);
      if (result.ok) {
        setCart([]);
        setBuyerName("");
        setNote("");
        setOperationId(crypto.randomUUID());
        router.refresh();
      }
    });
  }

  return (
    <div className="flex flex-col gap-5 pb-28 lg:pr-20">
      <section className="overflow-hidden rounded-lg border border-primary/18 bg-white shadow-[0_22px_60px_rgba(65,42,76,0.1)]">
        <div className="relative grid gap-4 border-b border-primary/10 bg-gradient-to-r from-[#eefaff] via-white to-[#fff3e8] p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-cyan-500 via-violet-500 to-orange-400" />
          <div className="flex items-center gap-3">
            <span className="flex size-12 items-center justify-center rounded-lg bg-primary text-white shadow-lg shadow-primary/20"><ShoppingBag aria-hidden="true" className="size-5" /></span>
            <div>
              <p className="text-[0.68rem] font-extrabold uppercase tracking-[0.16em] text-primary/55">PDV Candy</p>
              <h1 className="text-2xl font-extrabold tracking-normal text-primary sm:text-3xl">Vendas</h1>
              <p className="mt-1 text-sm text-muted-foreground">{monthLabels[currentPeriod.month]} de {currentPeriod.year}</p>
            </div>
          </div>
        <div className="grid gap-2 sm:grid-cols-3">
            <div className="rounded-lg border border-cyan-200 bg-cyan-50 p-3"><Boxes className="size-4 text-cyan-700" /><strong className="mt-2 block text-xl text-cyan-950">{products.filter((product) => product.isActive).length}</strong><span className="text-[0.65rem] font-bold uppercase text-cyan-800">Produtos</span></div>
            <div className="rounded-lg border border-violet-200 bg-violet-50 p-3"><PackagePlus className="size-4 text-violet-700" /><strong className="mt-2 block text-xl text-violet-950">{stockUnits}</strong><span className="text-[0.65rem] font-bold uppercase text-violet-800">No estoque</span></div>
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3"><ReceiptText className="size-4 text-emerald-700" /><strong className="mt-2 block text-xl text-emerald-950">{recentSales.filter((sale) => sale.status === "COMPLETED").length}</strong><span className="text-[0.65rem] font-bold uppercase text-emerald-800">Recentes</span></div>
          </div>
        </div>
      </section>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">
        <section className="overflow-hidden rounded-lg border border-primary/15 bg-white shadow-[0_18px_46px_rgba(65,42,76,0.08)]">
          <div className="border-b border-primary/10 bg-[#fbf9fc] p-4">
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
              <label className="relative block">
                <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-primary/45" />
                <Input className="h-11 bg-white pl-9" value={productSearch} onChange={(event) => setProductSearch(event.target.value)} placeholder="Buscar produto..." />
              </label>
              <Button
                aria-controls="sale-product-form"
                aria-expanded={isProductFormOpen}
                className="min-h-11"
                onClick={() => setIsProductFormOpen((current) => !current)}
                type="button"
                variant={isProductFormOpen ? "outline" : "default"}
              >
                <Plus aria-hidden="true" className={cn("size-4 transition-transform", isProductFormOpen && "rotate-45")} />
                {isProductFormOpen ? "Fechar cadastro" : "Cadastrar produto"}
              </Button>
            </div>

            {isProductFormOpen ? (
              <form
                id="sale-product-form"
                onSubmit={submitProduct}
                className="mt-4 grid gap-3 rounded-lg border border-cyan-200 bg-gradient-to-r from-cyan-50/70 via-white to-violet-50/70 p-4 shadow-sm sm:grid-cols-2 xl:grid-cols-[minmax(220px,1.7fr)_repeat(3,minmax(110px,1fr))_auto] xl:items-end"
              >
                <div className="sm:col-span-2 xl:col-span-5">
                  <strong className="block text-sm text-primary">Novo produto</strong>
                  <span className="text-xs text-muted-foreground">Cadastre os valores e o estoque inicial. Tudo permanece visivel antes de salvar.</span>
                </div>
                <label className="grid gap-1 text-xs font-bold text-primary sm:col-span-2 xl:col-span-1">Produto<Input placeholder="Ex: Caderno Candy" {...productForm.register("name")} /></label>
                <label className="grid gap-1 text-xs font-bold text-primary">Custo<Input min="0" placeholder="0,00" step="0.01" type="number" {...productForm.register("costCents", { setValueAs: moneyToCents })} /></label>
                <label className="grid gap-1 text-xs font-bold text-primary">Valor de venda<Input min="0.01" placeholder="0,00" step="0.01" type="number" {...productForm.register("salePriceCents", { setValueAs: moneyToCents })} /></label>
                <label className="grid gap-1 text-xs font-bold text-primary">Estoque inicial<Input min="0" type="number" {...productForm.register("stockQuantity", { valueAsNumber: true })} /></label>
                <Button disabled={isProductPending} className="self-end sm:col-span-2 xl:col-span-1" type="submit"><PackagePlus aria-hidden="true" />{isProductPending ? "Salvando" : "Salvar produto"}</Button>
                {Object.values(productForm.formState.errors)[0]?.message ? <p className="text-xs font-semibold text-red-700 sm:col-span-2 xl:col-span-5">{String(Object.values(productForm.formState.errors)[0]?.message)}</p> : null}
                {productMessage ? <p className="text-xs font-semibold text-primary sm:col-span-2 xl:col-span-5" role="status">{productMessage}</p> : null}
              </form>
            ) : null}
          </div>

          <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
            {activeProducts.map((product) => {
              const inCart = cart.find((item) => item.id === product.id)?.quantity ?? 0;
              return (
                <article className="relative overflow-hidden rounded-lg border border-primary/12 bg-gradient-to-br from-white via-white to-cyan-50/50 p-3 shadow-sm transition hover:-translate-y-0.5 hover:border-cyan-300 hover:shadow-md" key={product.id}>
                  <div className="flex items-start justify-between gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-cyan-100 text-cyan-800"><ShoppingBag aria-hidden="true" className="size-5" /></span>
                    <span className={cn("rounded-full border px-2 py-1 text-[0.65rem] font-extrabold", product.stockQuantity > 5 ? "border-emerald-200 bg-emerald-50 text-emerald-800" : product.stockQuantity > 0 ? "border-amber-200 bg-amber-50 text-amber-900" : "border-red-200 bg-red-50 text-red-800")}>{product.stockQuantity} em estoque</span>
                  </div>
                  <h2 className="mt-3 min-h-10 text-base font-extrabold leading-5 text-primary">{product.name}</h2>
                  <div className="mt-3 flex items-end justify-between gap-2">
                    <div><p className="text-[0.64rem] font-bold uppercase text-primary/50">Venda</p><strong className="text-xl tabular-nums text-cyan-800">{formatCurrency(product.salePriceCents)}</strong><p className="text-[0.68rem] text-muted-foreground">Custo {formatCurrency(product.costCents)}</p></div>
                    <Button aria-label={`Adicionar ${product.name}`} disabled={product.stockQuantity < 1 || inCart >= product.stockQuantity} onClick={() => addToCart(product)} size="icon" title="Adicionar ao carrinho"><Plus aria-hidden="true" /></Button>
                  </div>
                  {inCart > 0 ? <p className="mt-2 rounded-md bg-primary px-2 py-1 text-center text-xs font-bold text-white">{inCart} no carrinho</p> : null}
                  <ProductEditor product={product} />
                </article>
              );
            })}
            {activeProducts.length === 0 ? <div className="rounded-lg border border-dashed border-primary/20 p-8 text-center text-sm text-muted-foreground sm:col-span-2 lg:col-span-3">Nenhum produto encontrado.</div> : null}
          </div>
        </section>

        <aside className="overflow-hidden rounded-lg border border-primary/18 bg-white shadow-[0_22px_54px_rgba(65,42,76,0.12)] xl:sticky xl:top-5">
          <div className="flex items-center justify-between gap-3 bg-primary p-4 text-white">
            <span className="inline-flex items-center gap-2 font-extrabold"><ShoppingCart aria-hidden="true" className="size-5" />Carrinho</span>
            <span className="rounded-full bg-white/15 px-2.5 py-1 text-xs font-bold ring-1 ring-white/20">{cart.reduce((total, item) => total + item.quantity, 0)} item(ns)</span>
          </div>
          <div className="grid max-h-56 gap-2 overflow-y-auto p-3">
            {cart.map((item) => (
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-lg border border-primary/10 bg-[#fbf9fc] p-2" key={item.id}>
                <div className="min-w-0"><strong className="block truncate text-sm text-primary">{item.name}</strong><span className="text-xs tabular-nums text-muted-foreground">{formatCurrency(item.salePriceCents * item.quantity)}</span></div>
                <div className="flex items-center gap-1"><Button aria-label="Diminuir quantidade" onClick={() => changeQuantity(item.id, -1)} size="icon" variant="outline"><Minus aria-hidden="true" /></Button><span className="w-7 text-center text-sm font-bold tabular-nums">{item.quantity}</span><Button aria-label="Aumentar quantidade" disabled={item.quantity >= item.stockQuantity} onClick={() => changeQuantity(item.id, 1)} size="icon" variant="outline"><Plus aria-hidden="true" /></Button><Button aria-label="Remover produto" onClick={() => setCart((current) => current.filter((cartItem) => cartItem.id !== item.id))} size="icon" variant="ghost"><Trash2 aria-hidden="true" /></Button></div>
              </div>
            ))}
            {cart.length === 0 ? <div className="rounded-lg border border-dashed border-primary/20 p-6 text-center"><ShoppingCart className="mx-auto size-6 text-primary/35" /><p className="mt-2 text-sm text-muted-foreground">Carrinho vazio</p></div> : null}
          </div>
          <div className="grid gap-3 border-t border-primary/10 p-4">
            <div className="flex items-center justify-between gap-3"><span className="text-sm font-bold text-primary">Total</span><strong className="mr-20 text-2xl tabular-nums text-primary sm:mr-0">{formatCurrency(cartTotal)}</strong></div>
            <label className="grid gap-1 text-xs font-bold text-primary"><span className="inline-flex items-center gap-1.5"><Search className="size-3.5" />Buscar aluno</span><Input value={studentSearch} onChange={(event) => setStudentSearch(event.target.value)} placeholder="Nome ou email" /></label>
            <label className="grid gap-1 text-xs font-bold text-primary"><span className="inline-flex items-center gap-1.5"><UserRound className="size-3.5" />Quem vai comprar</span><NativeSelect value={studentProfileId} onChange={(event) => { setStudentProfileId(event.target.value); if (event.target.value) setBuyerName(""); }}><option value="">Outro comprador</option>{filteredStudents.map((student) => <option key={student.id} value={student.id}>{student.name} - {student.canInvoice ? "fatura ativa" : "sem fatura"}</option>)}</NativeSelect></label>
            {!selectedStudent ? <label className="grid gap-1 text-xs font-bold text-primary">Nome do comprador<Input value={buyerName} onChange={(event) => setBuyerName(event.target.value)} placeholder="Digite o nome" /></label> : <div className="rounded-lg border border-cyan-200 bg-cyan-50 p-2.5 text-xs"><strong className="block text-cyan-950">{selectedStudent.name}</strong><span className="text-cyan-800">{formatUnit(selectedStudent.unit)} · {selectedStudent.canInvoice ? "Fatura ativa" : "Sem fatura ativa"}</span></div>}
            <div className="grid grid-cols-2 gap-2" role="group" aria-label="Forma de acerto"><button type="button" onClick={() => setSettlementType("PAID_NOW")} className={cn("min-h-12 rounded-lg border px-2 text-xs font-extrabold transition", settlementType === "PAID_NOW" ? "border-emerald-500 bg-emerald-600 text-white shadow-md" : "border-primary/15 bg-white text-primary")}><CreditCard className="mx-auto mb-1 size-4" />Pago na hora</button><button type="button" onClick={() => setSettlementType("MONTHLY_INVOICE")} className={cn("min-h-12 rounded-lg border px-2 text-xs font-extrabold transition", settlementType === "MONTHLY_INVOICE" ? "border-amber-500 bg-amber-500 text-amber-950 shadow-md" : "border-primary/15 bg-white text-primary")}><ReceiptText className="mx-auto mb-1 size-4" />Fatura do mes</button></div>
            {settlementType === "PAID_NOW" ? <label className="grid gap-1 text-xs font-bold text-primary">Como foi pago<NativeSelect value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod)}>{SALE_PAYMENT_METHODS.map((method) => <option key={method} value={method}>{paymentMethodLabels[method]}</option>)}</NativeSelect></label> : null}
            {!selectedStudent ? <label className="grid gap-1 text-xs font-bold text-primary">Polo<NativeSelect value={unit} onChange={(event) => setUnit(event.target.value as FinancialUnit)}><option value="IVATE">Polo 1 - Ivate</option><option value="DOURADINA">Polo 2 - Douradina</option></NativeSelect></label> : null}
            <label className="grid gap-1 text-xs font-bold text-primary">Observacao opcional<Textarea className="min-h-16" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Detalhe da venda" /></label>
            {!invoiceReady ? <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">Este aluno precisa de mensalidade ativa e em aberto em {monthLabels[currentPeriod.month]} para usar a fatura.</p> : null}
            {checkoutMessage ? <p className="rounded-lg border border-primary/15 bg-primary/[0.05] px-3 py-2 text-xs font-semibold text-primary">{checkoutMessage}</p> : null}
            <Button className="h-12" disabled={isCheckoutPending || cart.length === 0 || !buyerReady || !invoiceReady} onClick={submitCheckout} type="button"><BadgeDollarSign aria-hidden="true" />{isCheckoutPending ? "Finalizando..." : settlementType === "MONTHLY_INVOICE" ? "Adicionar a fatura" : "Finalizar venda"}</Button>
          </div>
        </aside>
      </div>

      <section className="overflow-hidden rounded-lg border border-primary/15 bg-white shadow-[0_18px_46px_rgba(65,42,76,0.08)]">
        <div className="flex items-center justify-between gap-3 border-b border-primary/10 bg-gradient-to-r from-violet-50 via-white to-emerald-50 p-4"><span><p className="text-[0.68rem] font-extrabold uppercase tracking-[0.15em] text-primary/55">Movimento recente</p><h2 className="mt-1 text-xl font-extrabold text-primary">Histórico de vendas</h2></span><CircleDollarSign className="size-6 text-primary/45" /></div>
        <div className="grid gap-3 p-4 lg:grid-cols-2">{recentSales.map((sale) => <RecentSaleCard actorId={actor.id} isAdmin={actor.isAdmin} key={sale.id} sale={sale} />)}{recentSales.length === 0 ? <div className="rounded-lg border border-dashed border-primary/20 p-8 text-center text-sm text-muted-foreground lg:col-span-2">Nenhuma venda registrada.</div> : null}</div>
      </section>
    </div>
  );
}
