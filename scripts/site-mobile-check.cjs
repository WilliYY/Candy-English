// Run with playwright-cli run-code: pass this file's expression as the argument.
// Uses the already-open public page; never submits forms or sends messages.
/* eslint-disable @typescript-eslint/no-unused-expressions -- Expression evaluated by playwright-cli. */
async (page) => {
  const origin = page.url().split('/').slice(0, 3).join('/');
  const failures = [];
  const results = [];
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 850 });
    await page.goto(origin + '/');
    await page.getByRole('article', { name: 'Banners Candy English' }).first().waitFor();
    const layout = await page.evaluate(() => {
      const visible = (el) => el.getBoundingClientRect().width > 0 && el.getBoundingClientRect().height > 0;
      const banners = [...document.querySelectorAll('article[aria-label="Banners Candy English"]')].filter(visible);
      const banner = banners[0].getBoundingClientRect();
      const heading = document.querySelector('h1').getBoundingClientRect();
      const dots = [...document.querySelectorAll('button[aria-label^="Mostrar banner"]')].filter(visible);
      return {
        width: innerWidth,
        documentWidth: document.documentElement.scrollWidth,
        bannerInside: banner.left >= 0 && banner.right <= innerWidth,
        readableHeading: heading.width > 20 && heading.height > 20,
        touchTargets: dots.every(el => el.getBoundingClientRect().height >= 44 && el.getBoundingClientRect().width >= 44),
      };
    });
    results.push(layout);
    if (layout.documentWidth > width + 1) failures.push(`${width}: document overflow`);
    if (!layout.bannerInside) failures.push(`${width}: clipped carousel`);
    if (!layout.readableHeading) failures.push(`${width}: hidden heading`);
    if (!layout.touchTargets) failures.push(`${width}: small slide controls`);
  }
  if (failures.length) throw new Error(failures.join('; '));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(origin + '/');
  await page.getByRole('button', { name: 'Pausar troca automática', exact: true }).click();
  await page.getByRole('button', { name: 'Ativar troca automática', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Mostrar banner 2', exact: true }).click();
  await page.getByRole('heading', { name: 'Aula Candy', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Abrir menu', exact: true }).click();
  await page.getByRole('button', { name: 'Fechar menu', exact: true }).first().waitFor();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Abrir menu', exact: true }).waitFor();
  return { results, failures, pause: true, slide: true, menuEscape: true };
}
