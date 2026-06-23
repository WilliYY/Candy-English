"use client";

import { Download, LoaderCircle } from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import type {
  PDFDocumentLoadingTask,
  PDFDocumentProxy,
  RenderTask,
} from "pdfjs-dist/types/src/display/api";
import { cn } from "@/lib/utils";

export type InteractiveHomeworkDocumentField = {
  height: number;
  id: string;
  label: string | null;
  page: number;
  width: number;
  x: number;
  y: number;
};

type IndexedField<TField extends InteractiveHomeworkDocumentField> = {
  field: TField;
  index: number;
};

type InteractiveHomeworkDocumentProps<
  TField extends InteractiveHomeworkDocumentField,
> = {
  assetMimeType: string | null;
  assetUrl: string;
  className?: string;
  expectedPageCount?: number | null;
  fields: TField[];
  mobileReadable?: boolean;
  pageClassName?: string;
  renderPageForeground?: (pageNumber: number) => ReactNode;
  renderPageOverlay?: (pageNumber: number) => ReactNode;
  renderField: (
    field: TField,
    index: number,
    style: CSSProperties,
  ) => ReactNode;
  title: string;
};

const DEFAULT_PAGE_SIZE = {
  height: 842,
  width: 595,
};

function getAssetDownloadUrl(assetUrl: string) {
  return `${assetUrl}${assetUrl.includes("?") ? "&" : "?"}download=1`;
}

function clampPercent(value: number, fallback = 0) {
  if (!Number.isFinite(value)) {
    return fallback;
  }

  return Math.min(100, Math.max(0, value));
}

function fieldStyle(field: InteractiveHomeworkDocumentField): CSSProperties {
  const width = Math.max(1, clampPercent(field.width, 12));
  const height = Math.max(1, clampPercent(field.height, 5));
  const x = Math.min(100 - width, clampPercent(field.x));
  const y = Math.min(100 - height, clampPercent(field.y));

  return {
    height: `${height}%`,
    left: `${x}%`,
    top: `${y}%`,
    width: `${width}%`,
  };
}

function groupFieldsByPage<TField extends InteractiveHomeworkDocumentField>(
  fields: TField[],
) {
  const groups = new Map<number, IndexedField<TField>[]>();

  fields.forEach((field, index) => {
    const page = Math.max(1, Math.floor(field.page || 1));
    const pageFields = groups.get(page) ?? [];
    pageFields.push({ field, index });
    groups.set(page, pageFields);
  });

  return groups;
}

function PageOverlay<TField extends InteractiveHomeworkDocumentField>({
  fields,
  pageNumber,
  renderPageForeground,
  renderPageOverlay,
  renderField,
}: {
  fields: IndexedField<TField>[];
  pageNumber: number;
  renderPageForeground?: (pageNumber: number) => ReactNode;
  renderPageOverlay?: (pageNumber: number) => ReactNode;
  renderField: (
    field: TField,
    index: number,
    style: CSSProperties,
  ) => ReactNode;
}) {
  return (
    <div className="absolute inset-0 z-10">
      {renderPageOverlay?.(pageNumber)}
      {fields.map(({ field, index }) =>
        renderField(field, index, fieldStyle(field)),
      )}
      {renderPageForeground?.(pageNumber)}
    </div>
  );
}

function ImageDocument<TField extends InteractiveHomeworkDocumentField>({
  assetUrl,
  className,
  fieldsByPage,
  mobileReadable,
  pageClassName,
  renderPageForeground,
  renderPageOverlay,
  renderField,
  title,
}: {
  assetUrl: string;
  className?: string;
  fieldsByPage: Map<number, IndexedField<TField>[]>;
  mobileReadable?: boolean;
  pageClassName?: string;
  renderPageForeground?: (pageNumber: number) => ReactNode;
  renderPageOverlay?: (pageNumber: number) => ReactNode;
  renderField: (
    field: TField,
    index: number,
    style: CSSProperties,
  ) => ReactNode;
  title: string;
}) {
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [imageStatus, setImageStatus] = useState<
    "error" | "loading" | "ready"
  >("loading");

  useEffect(() => {
    setImageStatus("loading");
  }, [assetUrl]);

  return (
    <div
      aria-label={mobileReadable ? `Documento ${title}` : undefined}
      className={cn(
        "flex w-full",
        mobileReadable
          ? "justify-start overflow-x-auto overscroll-x-contain pb-2 sm:justify-center sm:overflow-visible sm:pb-0"
          : "justify-center",
        className,
      )}
      role={mobileReadable ? "region" : undefined}
      tabIndex={mobileReadable ? 0 : undefined}
    >
      <div
        data-homework-page="1"
        className={cn(
          "relative isolate mx-auto w-full max-w-[920px] overflow-hidden rounded-lg border-2 border-primary/25 bg-white shadow-inner",
          mobileReadable && "min-w-[560px] sm:min-w-0",
          pageClassName,
        )}
        style={{
          aspectRatio: `${pageSize.width} / ${pageSize.height}`,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- Protected homework assets use the authenticated route. */}
        <img
          data-homework-page-media="1"
          alt={`Homework ${title}`}
          className="absolute inset-0 z-0 size-full object-fill"
          onError={() => setImageStatus("error")}
          onLoad={(event) => {
            const image = event.currentTarget;

            if (image.naturalWidth > 0 && image.naturalHeight > 0) {
              setPageSize({
                height: image.naturalHeight,
                width: image.naturalWidth,
              });
            }

            setImageStatus("ready");
          }}
          src={assetUrl}
        />
        {imageStatus === "loading" ? (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-white text-primary">
            <LoaderCircle aria-hidden="true" className="size-6 animate-spin" />
          </div>
        ) : null}
        {imageStatus === "error" ? (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-white px-4 text-center text-sm text-muted-foreground">
            <span>Nao foi possivel mostrar esta imagem.</span>
            <a
              className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-2 font-semibold text-primary"
              href={getAssetDownloadUrl(assetUrl)}
            >
              Baixar arquivo original
              <Download aria-hidden="true" className="size-4" />
            </a>
          </div>
        ) : null}
        <PageOverlay
          fields={fieldsByPage.get(1) ?? []}
          pageNumber={1}
          renderPageForeground={renderPageForeground}
          renderPageOverlay={renderPageOverlay}
          renderField={renderField}
        />
      </div>
    </div>
  );
}

function PdfCanvasPage<TField extends InteractiveHomeworkDocumentField>({
  assetUrl,
  fields,
  mobileReadable,
  pageClassName,
  pageNumber,
  pdf,
  renderPageForeground,
  renderPageOverlay,
  renderField,
}: {
  assetUrl: string;
  fields: IndexedField<TField>[];
  mobileReadable?: boolean;
  pageClassName?: string;
  pageNumber: number;
  pdf: PDFDocumentProxy;
  renderPageForeground?: (pageNumber: number) => ReactNode;
  renderPageOverlay?: (pageNumber: number) => ReactNode;
  renderField: (
    field: TField,
    index: number,
    style: CSSProperties,
  ) => ReactNode;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pageRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState(false);
  const [isRendered, setIsRendered] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [renderWidth, setRenderWidth] = useState(0);

  useEffect(() => {
    const node = pageRef.current;

    if (!node) {
      return undefined;
    }

    const updateWidth = () => {
      setRenderWidth(Math.round(node.getBoundingClientRect().width));
    };

    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(node);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const node = pageRef.current;

    if (!node || typeof IntersectionObserver === "undefined") {
      setShouldRender(true);
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShouldRender(true);
          observer.disconnect();
        }
      },
      { rootMargin: "600px 0px" },
    );
    observer.observe(node);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas || renderWidth <= 0 || !shouldRender) {
      return undefined;
    }

    let cancelled = false;
    let renderTask: RenderTask | null = null;

    setError(false);
    setIsRendered(false);

    void pdf
      .getPage(pageNumber)
      .then(async (page) => {
        if (cancelled) {
          return;
        }

        const baseViewport = page.getViewport({ scale: 1 });
        const maxPixelRatio = window.matchMedia("(max-width: 639px)").matches
          ? 1.25
          : 2;
        const pixelRatio = Math.min(
          window.devicePixelRatio || 1,
          maxPixelRatio,
        );
        const cssWidth = Math.max(280, renderWidth);
        const scale = cssWidth / baseViewport.width;
        const viewport = page.getViewport({ scale: scale * pixelRatio });

        setPageSize({
          height: baseViewport.height,
          width: baseViewport.width,
        });

        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);

        renderTask = page.render({
          canvas,
          viewport,
        });

        await renderTask.promise;

        if (!cancelled) {
          setIsRendered(true);
        }
      })
      .catch((renderError: unknown) => {
        if (
          !cancelled &&
          !(renderError instanceof Error && renderError.name === "RenderingCancelledException")
        ) {
          setError(true);
        }
      });

    return () => {
      cancelled = true;
      renderTask?.cancel();
    };
  }, [pageNumber, pdf, renderWidth, shouldRender]);

  return (
    <div
      ref={pageRef}
      data-homework-page={pageNumber}
      className={cn(
        "relative isolate mx-auto w-full max-w-[920px] overflow-hidden rounded-lg border-2 border-primary/25 bg-white shadow-inner",
        mobileReadable && "min-w-[560px] sm:min-w-0",
        pageClassName,
      )}
      style={{
        aspectRatio: `${pageSize.width} / ${pageSize.height}`,
      }}
    >
      <canvas
        ref={canvasRef}
        data-homework-page-media={pageNumber}
        aria-label={`Pagina ${pageNumber}`}
        className="absolute inset-0 z-0 size-full bg-white"
      />
      {!isRendered && !error ? (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-white text-primary">
          <LoaderCircle aria-hidden="true" className="size-6 animate-spin" />
        </div>
      ) : null}
      {error ? (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-white px-4 text-center text-sm text-muted-foreground">
          <span>Nao foi possivel renderizar esta pagina.</span>
          <a
            className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-2 font-semibold text-primary"
            href={getAssetDownloadUrl(assetUrl)}
          >
            Baixar arquivo original
            <Download aria-hidden="true" className="size-4" />
          </a>
        </div>
      ) : null}
      <PageOverlay
        fields={fields}
        pageNumber={pageNumber}
        renderPageForeground={renderPageForeground}
        renderPageOverlay={renderPageOverlay}
        renderField={renderField}
      />
    </div>
  );
}

function PdfDocument<TField extends InteractiveHomeworkDocumentField>({
  assetUrl,
  className,
  expectedPageCount,
  fieldsByPage,
  mobileReadable,
  pageClassName,
  renderPageForeground,
  renderPageOverlay,
  renderField,
}: {
  assetUrl: string;
  className?: string;
  expectedPageCount?: number | null;
  fieldsByPage: Map<number, IndexedField<TField>[]>;
  mobileReadable?: boolean;
  pageClassName?: string;
  renderPageForeground?: (pageNumber: number) => ReactNode;
  renderPageOverlay?: (pageNumber: number) => ReactNode;
  renderField: (
    field: TField,
    index: number,
    style: CSSProperties,
  ) => ReactNode;
}) {
  const [error, setError] = useState(false);
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);

  useEffect(() => {
    let cancelled = false;
    let loadingTask: PDFDocumentLoadingTask | null = null;

    setError(false);
    setPdf(null);

    void import("pdfjs-dist")
      .then((pdfjs) => {
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/build/pdf.worker.min.mjs",
          import.meta.url,
        ).toString();

        loadingTask = pdfjs.getDocument({
          url: assetUrl,
          withCredentials: true,
        });

        return loadingTask.promise;
      })
      .then((loadedPdf) => {
        if (!cancelled) {
          setPdf(loadedPdf);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError(true);
        }
      });

    return () => {
      cancelled = true;
      void loadingTask?.destroy();
    };
  }, [assetUrl]);

  const maxFieldPage = Math.max(1, ...fieldsByPage.keys());
  const pageCount = pdf?.numPages ?? Math.max(expectedPageCount ?? 1, maxFieldPage);
  const pages = Array.from({ length: pageCount }, (_, index) => index + 1);

  if (error) {
    return (
      <div
        className={cn(
          "flex min-h-48 flex-col items-center justify-center gap-3 rounded-lg border-2 border-primary/25 bg-white p-6 text-center text-sm text-muted-foreground",
          className,
        )}
      >
        <span>Nao foi possivel carregar o PDF.</span>
        <a
          className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-2 font-semibold text-primary"
          href={getAssetDownloadUrl(assetUrl)}
        >
          Baixar arquivo original
          <Download aria-hidden="true" className="size-4" />
        </a>
      </div>
    );
  }

  if (!pdf) {
    return (
      <div
        className={cn(
          "flex min-h-72 items-center justify-center rounded-lg border-2 border-primary/25 bg-white text-primary shadow-inner",
          className,
        )}
      >
        <LoaderCircle aria-hidden="true" className="size-6 animate-spin" />
      </div>
    );
  }

  return (
    <div
      aria-label={mobileReadable ? "Documento da atividade" : undefined}
      className={cn(
        "flex w-full flex-col gap-4",
        mobileReadable &&
          "overflow-x-auto overscroll-x-contain pb-2 sm:overflow-visible sm:pb-0",
        className,
      )}
      role={mobileReadable ? "region" : undefined}
      tabIndex={mobileReadable ? 0 : undefined}
    >
      {pages.map((pageNumber) => (
        <PdfCanvasPage
          key={pageNumber}
          assetUrl={assetUrl}
          fields={fieldsByPage.get(pageNumber) ?? []}
          mobileReadable={mobileReadable}
          pageClassName={pageClassName}
          pageNumber={pageNumber}
          pdf={pdf}
          renderPageForeground={renderPageForeground}
          renderPageOverlay={renderPageOverlay}
          renderField={renderField}
        />
      ))}
    </div>
  );
}

export function InteractiveHomeworkDocument<
  TField extends InteractiveHomeworkDocumentField,
>({
  assetMimeType,
  assetUrl,
  className,
  expectedPageCount,
  fields,
  mobileReadable = false,
  pageClassName,
  renderPageForeground,
  renderPageOverlay,
  renderField,
  title,
}: InteractiveHomeworkDocumentProps<TField>) {
  const fieldsByPage = useMemo(() => groupFieldsByPage(fields), [fields]);

  if (assetMimeType?.startsWith("image/")) {
    return (
      <ImageDocument
        assetUrl={assetUrl}
        className={className}
        fieldsByPage={fieldsByPage}
        mobileReadable={mobileReadable}
        pageClassName={pageClassName}
        renderPageForeground={renderPageForeground}
        renderPageOverlay={renderPageOverlay}
        renderField={renderField}
        title={title}
      />
    );
  }

  return (
    <PdfDocument
      assetUrl={assetUrl}
      className={className}
      expectedPageCount={expectedPageCount}
      fieldsByPage={fieldsByPage}
      mobileReadable={mobileReadable}
      pageClassName={pageClassName}
      renderPageForeground={renderPageForeground}
      renderPageOverlay={renderPageOverlay}
      renderField={renderField}
    />
  );
}
