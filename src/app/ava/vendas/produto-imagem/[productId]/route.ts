import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { isRole } from "@/lib/roles";
import { SALE_PRODUCT_IMAGE_MAX_BYTES } from "@/lib/sale-product-image";
import {
  detectAvatarMimeType,
  getStoragePath,
  isMissingStorageFileError,
} from "@/lib/storage";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ productId: string }> },
) {
  const session = await auth();

  if (
    !session?.user?.id ||
    !isRole(session.user.role) ||
    !["ADMIN", "TEACHER"].includes(session.user.role)
  ) {
    return new NextResponse("Nao autorizado.", { status: 401 });
  }

  const { productId } = await params;
  const prisma = getPrisma();
  const product = await prisma.saleProduct.findUnique({
    where: { id: productId },
    select: { imagePath: true },
  });

  if (!product?.imagePath) {
    return new NextResponse("Foto nao encontrada.", { status: 404 });
  }

  let file: Buffer;

  try {
    file = await readFile(getStoragePath(product.imagePath));
  } catch (error) {
    return new NextResponse(
      isMissingStorageFileError(error)
        ? "Foto nao encontrada."
        : "Nao foi possivel carregar a foto.",
      { status: isMissingStorageFileError(error) ? 404 : 500 },
    );
  }

  if (
    file.byteLength <= 0 ||
    file.byteLength > SALE_PRODUCT_IMAGE_MAX_BYTES ||
    detectAvatarMimeType(file) !== "image/webp"
  ) {
    return new NextResponse("Foto invalida.", { status: 422 });
  }

  const body = file.buffer.slice(
    file.byteOffset,
    file.byteOffset + file.byteLength,
  ) as ArrayBuffer;

  return new NextResponse(body, {
    headers: {
      "Cache-Control": "private, max-age=31536000, immutable",
      "Content-Length": String(file.byteLength),
      "Content-Type": "image/webp",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
