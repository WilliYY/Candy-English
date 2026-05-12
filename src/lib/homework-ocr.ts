export type DetectedHomeworkField = {
  height: number;
  label: string;
  page: number;
  placeholder: string;
  required: boolean;
  type: "SHORT_TEXT" | "LONG_TEXT" | "CHECKBOX";
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
    height: 12,
    label: "Resposta 1",
    page: 1,
    placeholder: "Escreva aqui",
    required: true,
    type: "LONG_TEXT",
    width: 82,
    x: 9,
    y: 58,
  },
  {
    height: 12,
    label: "Resposta 2",
    page: 1,
    placeholder: "Escreva aqui",
    required: false,
    type: "LONG_TEXT",
    width: 82,
    x: 9,
    y: 73,
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
    field.type === "SHORT_TEXT" || field.type === "CHECKBOX"
      ? field.type
      : "LONG_TEXT";
  const width = Math.max(8, clampPercent(field.width, type === "CHECKBOX" ? 8 : 36));
  const height = Math.max(5, clampPercent(field.height, type === "CHECKBOX" ? 6 : 10));
  const x = Math.min(100 - width, clampPercent(field.x, 8));
  const y = Math.min(100 - height, clampPercent(field.y, 18 + index * 12));

  return {
    height,
    label:
      typeof field.label === "string" && field.label.trim()
        ? field.label.trim().slice(0, 80)
        : `Campo ${index + 1}`,
    page: 1,
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
                  "Analise esta homework da Candy English e localize areas onde o aluno deve escrever, marcar ou responder. " +
                  "Retorne campos em porcentagem do canvas visual: x, y, width, height de 0 a 100. " +
                  "Prefira LONG_TEXT para linhas grandes, SHORT_TEXT para respostas pequenas e CHECKBOX para caixas de marcar. " +
                  "Ignore titulos, instrucoes e imagens decorativas. Use no maximo 16 campos e considere apenas a pagina 1.",
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
                        enum: ["SHORT_TEXT", "LONG_TEXT", "CHECKBOX"],
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
