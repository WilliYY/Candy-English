import PDFDocument from "pdfkit";
import {
  formatWorkedDuration,
  TIME_CLOCK_TIME_ZONE,
  type TimeClockEntryTypeValue,
} from "@/lib/time-clock-domain";

type TimeClockPdfEntry = {
  correctedAt: Date | null;
  justification: string | null;
  occurredAt: Date;
  source: "SELF" | "ADMIN";
  type: TimeClockEntryTypeValue;
};

type TimeClockPdfInput = {
  entries: TimeClockPdfEntry[];
  generatedAt?: Date;
  person: { email: string; name: string };
  period: { month: number; year: number };
  summary: {
    completedPairs: number;
    inconsistentEntries: number;
    openEntryAt: Date | null;
    workedMilliseconds: number;
  };
};

const dateTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: TIME_CLOCK_TIME_ZONE,
});

const monthFormatter = new Intl.DateTimeFormat("pt-BR", {
  month: "long",
  timeZone: "UTC",
  year: "numeric",
});

function entryTypeLabel(type: TimeClockEntryTypeValue) {
  return type === "ENTRY" ? "Entrada" : "Saida";
}
function cleanSingleLine(value: string | null | undefined) {
  return value?.replace(/\s+/g, " ").trim() || "-";
}

export async function buildTimeClockPdf({
  entries,
  generatedAt = new Date(),
  person,
  period,
  summary,
}: TimeClockPdfInput) {
  const document = new PDFDocument({
    info: {
      Author: "Candy English",
      Subject: "Espelho mensal de ponto",
      Title: `Ponto - ${person.name}`,
    },
    margin: 42,
    size: "A4",
  });
  const chunks: Buffer[] = [];
  const completed = new Promise<Buffer>((resolve, reject) => {
    document.on("data", (chunk: Buffer) => chunks.push(chunk));
    document.on("end", () => resolve(Buffer.concat(chunks)));
    document.on("error", reject);
  });
  const pageBottom = document.page.height - 52;

  function addPageHeader() {
    document
      .font("Helvetica-Bold")
      .fontSize(9)
      .fillColor("#5b4267")
      .text("CANDY ENGLISH | ESPELHO DE PONTO", 42, 28, {
        align: "right",
      });
  }

  function ensureSpace(height: number) {
    if (document.y + height <= pageBottom) return;
    document.addPage();
    addPageHeader();
    document.moveDown(1.2);
  }

  addPageHeader();
  document
    .font("Helvetica-Bold")
    .fontSize(22)
    .fillColor("#2c1338")
    .text("Espelho mensal de ponto", 42, 58);
  document
    .font("Helvetica")
    .fontSize(10)
    .fillColor("#6f6275")
    .text(
      `Gerado em ${dateTimeFormatter.format(generatedAt)} | Horario de Brasilia (${TIME_CLOCK_TIME_ZONE})`,
    );
  document.moveDown(1.4);

  const periodLabel = monthFormatter.format(
    new Date(Date.UTC(period.year, period.month - 1, 1)),
  );
  document
    .roundedRect(42, document.y, document.page.width - 84, 76, 6)
    .fillAndStroke("#fbf7ff", "#dfd1e6");
  const infoY = document.y + 14;
  document
    .font("Helvetica-Bold")
    .fontSize(12)
    .fillColor("#2c1338")
    .text(cleanSingleLine(person.name), 56, infoY, { width: 300 });
  document
    .font("Helvetica")
    .fontSize(9)
    .fillColor("#6f6275")
    .text(cleanSingleLine(person.email), 56, infoY + 19, { width: 300 });
  document
    .font("Helvetica-Bold")
    .fontSize(11)
    .fillColor("#2c1338")
    .text(periodLabel, 375, infoY, { align: "right", width: 160 });
  document
    .font("Helvetica")
    .fontSize(9)
    .fillColor("#6f6275")
    .text(`${entries.length} batida(s)`, 375, infoY + 19, {
      align: "right",
      width: 160,
    });
  document.y = infoY + 76;

  document
    .font("Helvetica-Bold")
    .fontSize(11)
    .fillColor("#2c1338")
    .text(`Total concluido: ${formatWorkedDuration(summary.workedMilliseconds)}`);
  document
    .font("Helvetica")
    .fontSize(9)
    .fillColor("#6f6275")
    .text(
      `${summary.completedPairs} periodo(s) completo(s) | ${summary.inconsistentEntries} inconsistencia(s)`,
    );
  if (summary.openEntryAt) {
    document
      .fillColor("#9a5b00")
      .text(`Periodo aberto desde ${dateTimeFormatter.format(summary.openEntryAt)}.`);
  }
  document.moveDown(1.2);

  const columns = {
    date: { width: 100, x: 42 },
    type: { width: 62, x: 150 },
    note: { width: 238, x: 220 },
    source: { width: 78, x: 466 },
  };

  function drawTableHeader() {
    ensureSpace(30);
    const y = document.y;
    document.rect(42, y, document.page.width - 84, 24).fill("#2c1338");
    document.font("Helvetica-Bold").fontSize(8).fillColor("#ffffff");
    document.text("Data e hora", columns.date.x + 6, y + 8, {
      width: columns.date.width,
    });
    document.text("Tipo", columns.type.x, y + 8, { width: columns.type.width });
    document.text("Justificativa", columns.note.x, y + 8, {
      width: columns.note.width,
    });
    document.text("Origem", columns.source.x, y + 8, {
      width: columns.source.width,
    });
    document.y = y + 30;
  }

  drawTableHeader();
  for (const [index, entry] of entries.entries()) {
    const note = cleanSingleLine(entry.justification);
    document.font("Helvetica").fontSize(8);
    const rowHeight = Math.max(
      28,
      document.heightOfString(note, { width: columns.note.width - 4 }) + 14,
    );
    if (document.y + rowHeight > pageBottom) {
      document.addPage();
      addPageHeader();
      document.y = 52;
      drawTableHeader();
    }
    const y = document.y;
    document
      .rect(42, y, document.page.width - 84, rowHeight)
      .fill(index % 2 === 0 ? "#ffffff" : "#faf8fb");
    document.fillColor("#2c1338");
    document.text(dateTimeFormatter.format(entry.occurredAt), columns.date.x + 6, y + 9, {
      width: columns.date.width - 6,
    });
    document.text(entryTypeLabel(entry.type), columns.type.x, y + 9, {
      width: columns.type.width,
    });
    document.text(note, columns.note.x, y + 9, {
      ellipsis: true,
      height: rowHeight - 10,
      width: columns.note.width - 4,
    });
    document.text(
      `${entry.source === "SELF" ? "Pessoa" : "Admin"}${entry.correctedAt ? "*" : ""}`,
      columns.source.x,
      y + 9,
      { width: columns.source.width },
    );
    document.y = y + rowHeight;
  }

  ensureSpace(70);
  document.moveDown(1.5);
  document
    .font("Helvetica")
    .fontSize(8)
    .fillColor("#6f6275")
    .text(
      "* Registro corrigido administrativamente; a versao anterior permanece no historico de auditoria.",
    );
  document.moveDown(2);
  document
    .strokeColor("#bba9c3")
    .moveTo(70, document.y)
    .lineTo(260, document.y)
    .stroke();
  document
    .strokeColor("#bba9c3")
    .moveTo(335, document.y)
    .lineTo(525, document.y)
    .stroke();
  const signatureY = document.y + 6;
  document
    .font("Helvetica")
    .fontSize(8)
    .fillColor("#6f6275")
    .text("Pessoa", 70, signatureY, { align: "center", width: 190 });
  document.text("Responsavel", 335, signatureY, {
    align: "center",
    width: 190,
  });

  document.end();
  return completed;
}
