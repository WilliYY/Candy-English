import { z } from "zod";

import {
  listAuthorizedChatMessages,
  sendAuthorizedChatMessage,
} from "@/lib/chat-service";
import { authorizeMobileAccess } from "@/lib/mobile-auth/access-session";
import {
  getMobileRequestId,
  mobileError,
  mobileJson,
} from "@/lib/mobile-auth/api-response";
import { parseBearerToken } from "@/lib/mobile-auth/tokens";
import { sendChatMessageSchema } from "@/lib/validations/ava-operations";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const chatPairSchema = z.object({
  studentProfileId: z.string().min(1),
  teacherProfileId: z.string().min(1),
});

async function authenticate(request: Request) {
  const token = parseBearerToken(request.headers.get("authorization"));

  if (!token) {
    return null;
  }

  const session = await authorizeMobileAccess(token);
  return session.ok ? session : null;
}

export async function GET(request: Request) {
  const requestId = getMobileRequestId(request);
  const session = await authenticate(request);

  if (!session) {
    return mobileError(
      "SESSION_INVALID",
      "Entre novamente para continuar.",
      401,
      requestId,
    );
  }

  const url = new URL(request.url);
  const parsed = chatPairSchema.safeParse({
    studentProfileId: url.searchParams.get("studentProfileId"),
    teacherProfileId: url.searchParams.get("teacherProfileId"),
  });

  if (!parsed.success) {
    return mobileError(
      "INVALID_REQUEST",
      "Conversa inválida.",
      400,
      requestId,
    );
  }

  const messages = await listAuthorizedChatMessages(
    { role: session.user.role, userId: session.user.id },
    parsed.data,
  );

  if (!messages) {
    return mobileError(
      "CHAT_FORBIDDEN",
      "Você não tem acesso a esta conversa.",
      403,
      requestId,
    );
  }

  return mobileJson({ messages, ok: true }, 200, requestId);
}

export async function POST(request: Request) {
  const requestId = getMobileRequestId(request);
  const session = await authenticate(request);

  if (!session) {
    return mobileError(
      "SESSION_INVALID",
      "Entre novamente para continuar.",
      401,
      requestId,
    );
  }

  const parsed = sendChatMessageSchema.safeParse(
    await request.json().catch(() => null),
  );

  if (!parsed.success) {
    return mobileError(
      "INVALID_REQUEST",
      parsed.error.issues[0]?.message ?? "Revise a mensagem.",
      400,
      requestId,
    );
  }

  const result = await sendAuthorizedChatMessage(
    { role: session.user.role, userId: session.user.id },
    parsed.data,
  );

  if (!result.ok) {
    return mobileError(
      "CHAT_FORBIDDEN",
      result.message,
      403,
      requestId,
    );
  }

  return mobileJson({ message: result.message, ok: true }, 201, requestId);
}
