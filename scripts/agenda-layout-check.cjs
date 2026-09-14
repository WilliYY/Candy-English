/* eslint-disable @typescript-eslint/no-unused-expressions -- expressão executada por playwright-cli run-code */
async (page) => {
  if (!page.url().startsWith("http://127.0.0.1:3114/")) throw new Error("Use somente a fixture isolada da agenda.");
  const check = (value, label) => { if (!value) throw new Error(label); };
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.reload();
  const edit = () => page.getByRole("button", { name: /Editar horário de Aluno com nome/ });
  const form = () => page.getByRole("form", { name: /Editar horário de Aluno com nome/ });
  const reports = [];
  for (const width of [320, 390, 768, 1024, 1280, 1440, 1880]) {
    await page.setViewportSize({ width, height: 950 });
    await edit().click();
    await form().getByLabel("Novo horário").fill("10:45");
    const dimensions = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth > innerWidth + 1,
      clipped: [...document.querySelectorAll(".agenda-compact-sheet [role=cell],.agenda-time-editor,input[type=time]")].filter(el => el.scrollWidth > el.clientWidth + 2).map(el => el.className),
      columns: getComputedStyle(document.querySelector(".agenda-sheet-row")).gridTemplateColumns,
    }));
    check(!dimensions.overflow && dimensions.clipped.length === 0, `Corte em ${width}: ${JSON.stringify(dimensions)}`);
    await form().getByRole("button", { name: "Cancelar", exact: true }).click();
    check(await edit().evaluate(el => el === document.activeElement), "Foco não retornou ao horário");
    check((await edit().textContent()).includes("08:00"), "Cancelar mudou o horário");
    reports.push({ width, ...dimensions });
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  await edit().focus();
  await page.keyboard.press("Enter");
  check(await form().getByLabel("Novo horário").evaluate(el => el === document.activeElement), "Editor sem foco por teclado");
  await form().getByLabel("Novo horário").fill("09:59");
  await form().getByRole("button", { name: "Salvar horário" }).click();
  await form().getByRole("alert").waitFor();
  check(await form().getByLabel("Novo horário").inputValue() === "09:59", "Erro apagou rascunho");
  await page.getByRole("button", { name: "Planilha mensal", exact: true }).click();
  check(await form().count() === 1, "Navegação descartou edição");
  await form().getByRole("button", { name: "Cancelar", exact: true }).click();
  await edit().click();
  await form().getByLabel("Novo horário").fill("09:30");
  await form().getByRole("button", { name: "Salvar horário" }).click();
  await page.locator(".agenda-compact-sheet").getByRole("status").waitFor();
  check((await edit().textContent()).includes("09:30"), "Aula não atualizou na tela");
  await page.getByRole("button", { name: "Planilha mensal", exact: true }).click();
  check((await edit().textContent()).includes("08:00"), "Mudar uma aula alterou rotina");
  await edit().click();
  check(await form().getByLabel("Aplicar em").inputValue() === "ROUTINE", "Mensal não seleciona rotina");
  await form().getByLabel("Novo horário").fill("10:15");
  await form().getByRole("button", { name: "Salvar horário" }).click();
  await page.locator(".agenda-compact-sheet").getByRole("status").waitFor();
  check((await edit().textContent()).includes("10:15"), "Rotina não atualizou na tela");
  for (const width of [320, 390, 768, 1024, 1280, 1440, 1880]) {
    await page.setViewportSize({ width, height: 950 });
    check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `Planilha mensal cortada em ${width}`);
  }
  await page.getByRole("button", { name: "Agenda do dia", exact: true }).click();
  const row = () => page.locator(".agenda-sheet-row").filter({ has: page.getByRole("button", { name: /Abrir ficha de Aluno com nome/ }) });
  await row().getByRole("button", { name: "Veio", exact: true }).click();
  await row().getByRole("button", { name: /Resetar presença/ }).waitFor();
  check(await edit().count() === 0, "Permitiu editar presença registrada");
  await row().getByRole("button", { name: /Resetar presença/ }).click();
  await edit().waitFor();
  await page.getByRole("searchbox").fill("naoexiste");
  check(await page.locator(".agenda-compact-sheet").getByRole("status").count() === 1, "Vazio sem orientação");
  await page.getByRole("searchbox").fill("");
  await page.getByRole("button", { name: "Polo 2 - Douradina", exact: true }).click();
  check(await page.getByRole("table").count() === 1, "Filtro de polo falhou");
  await page.getByRole("button", { name: "Todos os polos", exact: true }).click();
  check(await page.getByRole("table").count() === 2, "Não restaurou polos");
  await page.locator(".agenda-compact-sheet").scrollIntoViewIfNeeded();
  await page.screenshot({ path: "C:/Users/Williany/Desktop/candy english/output/playwright/agenda-final-desktop.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  await edit().click();
  await form().scrollIntoViewIfNeeded();
  await page.screenshot({ path: "C:/Users/Williany/Desktop/candy english/output/playwright/agenda-final-mobile.png" });
  await form().getByRole("button", { name: "Cancelar", exact: true }).click();
  check(errors.length === 0, `Erros React: ${errors.join("; ")}`);
  return { reports, interactions: "keyboard, focus, cancel, error, draft protection, lesson vs routine, attendance, search, polo", errors };
}
