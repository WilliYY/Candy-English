export const SALE_PRODUCT_IMAGE_MAX_BYTES = 8 * 1024 * 1024;
export const SALE_PRODUCT_IMAGE_WIDTH = 1200;
export const SALE_PRODUCT_IMAGE_HEIGHT = 900;

export class SaleProductImageError extends Error {}

export async function convertSaleProductImageToWebp(buffer: Buffer) {
  try {
    const { default: sharp } = await import("sharp");

    return await sharp(buffer, {
      failOn: "error",
      limitInputPixels: 40_000_000,
    })
      .rotate()
      .resize(SALE_PRODUCT_IMAGE_WIDTH, SALE_PRODUCT_IMAGE_HEIGHT, {
        fit: "cover",
        position: "centre",
        withoutEnlargement: false,
      })
      .webp({ effort: 4, quality: 84 })
      .toBuffer();
  } catch {
    throw new SaleProductImageError(
      "Nao foi possivel ler esta imagem. Escolha outra foto PNG, JPG ou WebP.",
    );
  }
}
