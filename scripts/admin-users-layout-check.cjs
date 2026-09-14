// Expression for playwright-cli run-code against admin-users-layout-preview.mjs.
/* eslint-disable @typescript-eslint/no-unused-expressions -- Evaluated by playwright-cli. */
async (page) => {
  const origin = "http://127.0.0.1:3112";
  if (page.url().split("/").slice(0, 3).join("/") !== origin) throw new Error("Use the isolated fixture, not production.");
  const layouts = [];
  for (const width of [320, 390, 768, 1024, 1280, 1440, 1880]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(origin);
    const summary = page.locator("details.group\\/sheet-row > summary").nth(1);
    await summary.waitFor();
    await summary.focus();
    await page.keyboard.press("Enter");
    await page.locator("details.group\\/sheet-row[open]").waitFor();
    const result = await page.evaluate(() => {
      const sheet = document.querySelector(".admin-users-sheet");
      const detail = document.querySelector("details[open] [data-user-detail-viewport]");
      const header = detail.firstElementChild;
      const clipped = [...sheet.querySelectorAll("p,strong,input,button,.admin-users-sheet-row > span")]
        .filter(el => el.getBoundingClientRect().width > 0 && el.scrollWidth > el.clientWidth + 1)
        .map(el => el.tagName);
      return {
        width: innerWidth, document: document.documentElement.scrollWidth,
        sheet: sheet.clientWidth, content: sheet.scrollWidth,
        detail: detail.clientWidth,
        used: header.getBoundingClientRect().width / detail.clientWidth,
        clipped,
      };
    });
    if (result.document > width || result.content > result.sheet + 1 || result.clipped.length || result.used < 0.88) {
      throw new Error(JSON.stringify(result));
    }
    layouts.push(result);
  }
  await page.getByRole("button", { name: "Teachers", exact: true }).click();
  if (await page.locator("details.group\\/sheet-row").count() !== 1) throw new Error("Role filter failed");
  await page.getByPlaceholder("Buscar nome, e-mail ou telefone").fill("PROFESSORA");
  if (await page.locator("details.group\\/sheet-row").count() !== 1) throw new Error("Search failed");
  await page.getByRole("button", { name: "Alunos", exact: true }).click();
  await page.getByText("Nenhum usuário encontrado.", { exact: true }).waitFor();
  await page.getByRole("button", { name: "Limpar filtros", exact: true }).first().click();
  if (await page.locator("details.group\\/sheet-row").count() !== 3) throw new Error("Clear filter failed");
  await page.locator(".admin-users-sheet select").selectOption("DOURADINA");
  if (await page.locator("details.group\\/sheet-row").count() !== 2) throw new Error("Polo filter failed");
  await page.getByRole("button", { name: "Limpar filtros", exact: true }).first().click();
  await page.setViewportSize({ width: 320, height: 850 });
  const student = page.locator("details.group\\/sheet-row").nth(2);
  await student.locator("summary").first().click();
  await student.getByText("Editar dados do aluno", { exact: true }).click();
  await student.getByLabel("Nome completo").focus();
  const fits = await student.getByLabel("Nome completo").evaluate(el => el.getBoundingClientRect().right <= innerWidth);
  if (!fits) throw new Error("Student form is clipped");
  return { layouts, keyboard: true, roleSearchPoloFilters: true, emptyState: true, studentForm: true };
}
