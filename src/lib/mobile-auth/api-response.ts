import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

const REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]{8,128}$/;

function mobileHeaders(requestId: string) {
  return {
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    "x-request-id": requestId,
  };
}

export function getMobileRequestId(request: Request) {
  const supplied = request.headers.get("x-request-id");

  return supplied && REQUEST_ID_PATTERN.test(supplied)
    ? supplied
    : randomUUID();
}

export function mobileJson<T>(
  body: T,
  status: number,
  requestId: string,
) {
  return NextResponse.json(body, {
    headers: mobileHeaders(requestId),
    status,
  });
}

export function mobileError(
  code: string,
  message: string,
  status: number,
  requestId: string,
) {
  return mobileJson(
    {
      error: {
        code,
        message,
      },
      ok: false,
      requestId,
    },
    status,
    requestId,
  );
}

export function mobileNoContent(requestId: string) {
  return new NextResponse(null, {
    headers: mobileHeaders(requestId),
    status: 204,
  });
}
