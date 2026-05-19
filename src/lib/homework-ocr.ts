export type DetectedHomeworkField = {
  height: number;
  label: string;
  page: number;
  placeholder: string;
  required: boolean;
  type: "SHORT_TEXT" | "LONG_TEXT" | "CHECKBOX" | "DRAWING";
  width: number;
  x: number;
  y: number;
};

type DetectionInput = {
  buffer: Buffer;
  fileName: string;
  mimeType: string;
};

type DetectionResult = {
  fields: DetectedHomeworkField[];
  source: "openai" | "fallback";
};

const fallbackFields: DetectedHomeworkField[] = [
  {
    height: 5,
    label: "Resposta 1",
    page: 1,
    placeholder: "",
    required: true,
    type: "SHORT_TEXT",
    width: 32,
    x: 34,
    y: 44,
  },
  {
    height: 5,
    label: "Resposta 2",
    page: 1,
    placeholder: "",
    required: false,
    type: "SHORT_TEXT",
    width: 32,
    x: 34,
    y: 54,
  },
];

function clampPercent(value: unknown, fallback: number) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return fallback;
  }

  return Math.min(100, Math.max(0, Math.round(value * 10) / 10));
}

function normalizeField(value: unknown, index: number): DetectedHomeworkField {
  const field =
    typeof value === "object" && value !== null
      ? (value as Partial<DetectedHomeworkField>)
      : {};
  const type =
    field.type === "SHORT_TEXT" ||
    field.type === "CHECKBOX" ||
    field.type === "DRAWING"
      ? field.type
      : "LONG_TEXT";
  const widthFallback =
    type === "CHECKBOX" ? 5 : type === "SHORT_TEXT" ? 24 : 48;
  const heightFallback =
    type === "CHECKBOX" ? 5 : type === "SHORT_TEXT" ? 4 : 8;
  const widthMax =
    type === "CHECKBOX" ? 10 : type === "SHORT_TEXT" ? 42 : 92;
  const heightMax =
    type === "CHECKBOX" ? 10 : type === "SHORT_TEXT" ? 7 : 24;
  const width = Math.max(
    type === "CHECKBOX" ? 4 : 6,
    Math.min(widthMax, clampPercent(field.width, widthFallback)),
  );
  const height = Math.max(
    4,
    Math.min(heightMax, clampPercent(field.height, heightFallback)),
  );
  const x = Math.min(100 - width, clampPercent(field.x, 8));
  const y = Math.min(100 - height, clampPercent(field.y, 18 + index * 12));

  return {
    height,
    label:
      typeof field.label === "string" && field.label.trim()
        ? field.label.trim().slice(0, 80)
        : `Campo ${index + 1}`,
    page:
      typeof field.page === "number" && Number.isFinite(field.page)
        ? Math.min(20, Math.max(1, Math.floor(field.page)))
        : 1,
    placeholder:
      typeof field.placeholder === "string"
        ? field.placeholder.trim().slice(0, 120)
        : "",
    required: Boolean(field.required),
    type,
    width,
    x,
    y,
  };
}

function extractOutputText(payload: unknown) {
  if (typeof payload !== "object" || payload === null) {
    return "";
  }

  if (
    "output_text" in payload &&
    typeof (payload as { output_text?: unknown }).output_text === "string"
  ) {
    return (payload as { output_text: string }).output_text;
  }

  const output = (payload as { output?: unknown }).output;
  if (!Array.isArray(output)) {
    return "";
  }

  for (const item of output) {
    const content =
      typeof item === "object" && item !== null
        ? (item as { content?: unknown }).content
        : null;

    if (!Array.isArray(content)) {
      continue;
    }

    for (const part of content) {
      if (
        typeof part === "object" &&
        part !== null &&
        "text" in part &&
        typeof (part as { text?: unknown }).text === "string"
      ) {
        return (part as { text: string }).text;
      }
    }
  }

  return "";
}

function parseDetectedFields(text: string) {
  const parsed = JSON.parse(text) as { fields?: unknown };

  if (!Array.isArray(parsed.fields)) {
    return [];
  }

  return parsed.fields
    .slice(0, 16)
    .map((field, index) => normalizeField(field, index))
    .filter((field) => field.width > 0 && field.height > 0);
}

export async function detectHomeworkFields({
  buffer,
  fileName,
  mimeType,
}: DetectionInput): Promise<DetectionResult> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    return { fields: fallbackFields, source: "fallback" };
  }

  const model = process.env.OPENAI_HOMEWORK_OCR_MODEL?.trim() || "gpt-4.1-mini";
  const base64 = buffer.toString("base64");
  const content =
    mimeType === "application/pdf"
      ? {
          file_data: `data:${mimeType};base64,${base64}`,
          filename: fileName || "homework.pdf",
          type: "input_file",
        }
      : {
          detail: "high",
          image_url: `data:${mimeType};base64,${base64}`,
          type: "input_image",
        };

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      body: JSON.stringify({
        input: [
          {
            content: [
              content,
              {
                text:
                  "Analise o PDF ou imagem original da homework da Candy English sem redesenhar nem alterar o arquivo. " +
                  "Sua tarefa e apenas sugerir campos HTML transparentes onde o aluno deve digitar, marcar ou responder por cima do arquivo visivel. " +
                  "Retorne coordenadas em porcentagem do retangulo real de cada pagina do PDF ou imagem: x, y, width, height de 0 a 100, com page iniciando em 1. " +
                  "Crie campos somente sobre espacos em branco, lacunas com underscores, linhas de resposta, caixas vazias ou checkboxes. " +
                  "Nao cubra enunciados, instrucoes, titulos, frases impressas, imagens decorativas ou texto que ja esteja respondido no PDF. " +
                  "Se uma frase tiver uma lacuna como 'I work __ home', posicione o campo apenas sobre a lacuna, nunca sobre a frase inteira. " +
                  "Campos de linha devem ser baixos e justos; use SHORT_TEXT para lacunas pequenas, LONG_TEXT para areas grandes vazias, CHECKBOX para caixas de marcar e DRAWING para areas de desenho ou resposta manuscrita. " +
                  "Use rotulos curtos como 'Resposta 1' e deixe placeholder vazio quando o texto do PDF ja indicar o que responder. " +
                  "Use no maximo 16 campos e preserve a pagina correta de cada campo.",
                type: "input_text",
              },
            ],
            role: "user",
          },
        ],
        max_output_tokens: 1800,
        model,
        text: {
          format: {
            name: "homework_fields",
            schema: {
              additionalProperties: false,
              properties: {
                fields: {
                  items: {
                    additionalProperties: false,
                    properties: {
                      height: { maximum: 100, minimum: 1, type: "number" },
                      label: { type: "string" },
                      page: { minimum: 1, type: "integer" },
                      placeholder: { type: "string" },
                      required: { type: "boolean" },
                      type: {
                        enum: ["SHORT_TEXT", "LONG_TEXT", "CHECKBOX", "DRAWING"],
                        type: "string",
                      },
                      width: { maximum: 100, minimum: 1, type: "number" },
                      x: { maximum: 100, minimum: 0, type: "number" },
                      y: { maximum: 100, minimum: 0, type: "number" },
                    },
                    required: [
                      "label",
                      "type",
                      "page",
                      "x",
                      "y",
                      "width",
                      "height",
                      "required",
                      "placeholder",
                    ],
                    type: "object",
                  },
                  maxItems: 16,
                  type: "array",
                },
              },
              required: ["fields"],
              type: "object",
            },
            strict: true,
            type: "json_schema",
          },
        },
      }),
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      method: "POST",
    });

    if (!response.ok) {
      return { fields: fallbackFields, source: "fallback" };
    }

    const payload = (await response.json()) as unknown;
    const detected = parseDetectedFields(extractOutputText(payload));

    return {
      fields: detected.length > 0 ? detected : fallbackFields,
      source: detected.length > 0 ? "openai" : "fallback",
    };
  } catch {
    return { fields: fallbackFields, source: "fallback" };
  }
}
