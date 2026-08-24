import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";
import {
  convertSaleProductImageToWebp,
  SALE_PRODUCT_IMAGE_HEIGHT,
  SALE_PRODUCT_IMAGE_WIDTH,
  SaleProductImageError,
} from "@/lib/sale-product-image";

test("converts and center-crops product photos to the catalog WebP format", async () => {
  const source = await sharp({
    create: {
      background: { alpha: 1, b: 190, g: 120, r: 35 },
      channels: 4,
      height: 900,
      width: 1600,
    },
  })
    .png()
    .toBuffer();

  const webp = await convertSaleProductImageToWebp(source);
  const metadata = await sharp(webp).metadata();

  assert.equal(metadata.format, "webp");
  assert.equal(metadata.width, SALE_PRODUCT_IMAGE_WIDTH);
  assert.equal(metadata.height, SALE_PRODUCT_IMAGE_HEIGHT);
});

test("rejects content that is not a readable product image", async () => {
  await assert.rejects(
    convertSaleProductImageToWebp(Buffer.from("not-an-image")),
    SaleProductImageError,
  );
});
