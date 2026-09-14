// Expression for playwright-cli run-code on the public home; no forms are submitted.
/* eslint-disable @typescript-eslint/no-unused-expressions -- Evaluated by playwright-cli. */
async (page) => {
  const origin = page.url().split("/").slice(0, 3).join("/");
  const results = [];
  for (const width of [320, 390, 768, 1024, 1440, 1880]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(origin + "/");
    const logo = page.locator("footer [data-candy-logo]");
    await logo.scrollIntoViewIfNeeded();
    await logo.locator("img").evaluate(img => img.decode());
    await logo.hover();
    const result = await logo.evaluate(link => {
      const img = link.querySelector("img");
      const outer = link.getBoundingClientRect();
      const media = img.getBoundingClientRect();
      return {
        width: innerWidth,
        documentWidth: document.documentElement.scrollWidth,
        logoWidth: outer.width, logoHeight: outer.height,
        imageWidth: media.width, imageHeight: media.height,
        complete: img.complete && img.naturalWidth > 0,
        static: !link.querySelector("video"),
        contained: media.left >= outer.left - 1 && media.top >= outer.top - 1 && media.right <= outer.right + 1 && media.bottom <= outer.bottom + 1,
      };
    });
    if (!result.complete || !result.static || !result.contained || result.documentWidth > width) {
      throw new Error(JSON.stringify(result));
    }
    results.push(result);
  }
  return results;
}
