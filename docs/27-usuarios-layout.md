# Gestão de usuários — largura útil e leitura

## Pedido e diagnóstico — 14/09/2026

Corrigir cortes e espaço desperdiçado em `/ava/admin?task=usuarios`, preservando
planilha/cartões, filtros, formulários, exclusão, senhas, dados e permissões.

Reprodução com componente real e dados fictícios: em 1440 px, a região tinha
949 px, mas a planilha exigia 1320 px. O detalhe ainda reservava 272 px à direita
(`xl:pr-[17rem]`) e usava apenas 70% da largura. A coluna de ações fixa cobria
informações adjacentes. O limite `max-w-7xl` também desperdiçava espaço em monitores
maiores. Não era necessário alterar dados ou regras de acesso.

## Direção e implementação

Painel operacional, não uma landing page: fonte e paleta Candy existentes
(roxo `#412a4c`, fundo `#fefbfa`, borda `#eadfec`, apoio `#fcf1f8`), texto de dados
12–14 px, título 16 px, espaçamento 8/12/16 px e controles de pelo menos 44 px.
A característica principal é uma linha escaneável que abre um painel completo.

- `admin-users-panel.tsx`: somente a tarefa `usuarios` usa toda a largura útil.
- `admin-users-sheet.tsx`: seis colunas, agrupando nome/e-mail, role/status e
  perfil/pendência; telefone sem repetir e-mail. Cadastro permanece explícito no
  detalhe. Sem colunas sobrepostas nem largura mínima forçada.
- `globals.css`: regras isoladas em `.admin-users-sheet` com container queries.
  A disposição acompanha a área real, descontando sidebar e bordas, e não somente
  a largura da tela. Abaixo de 56 rem, cada registro se reorganiza verticalmente.
- Detalhes e histórico usam a largura integral; formulários dividem a área somente
  quando há espaço real. O balão automático da Catty fica oculto enquanto um
  detalhe está aberto; botão e conversa da mascote são preservados.
- Navegação nativa por `details/summary`, teclado e indicadores textuais mantidos.

## Validação reproduzível

`node scripts/admin-users-layout-preview.mjs` inicia apenas em `127.0.0.1:3112`,
com o componente real, CSS do projeto e três registros fictícios. Usa ferramentas
já presentes no lockfile (`esbuild` via `tsx`, PostCSS/Tailwind), sem instalar
dependências, carregar credenciais ou consultar o banco. Não é rota da aplicação.

Abrir essa URL com `playwright-cli` e passar a expressão de
`scripts/admin-users-layout-check.cjs` a `run-code`. O teste rejeita outra origem;
cobre 320, 390, 768, 1024, 1280, 1440 e 1880 px, largura, textos, painel, teclado,
busca, role, polo, estado vazio e abertura do formulário fictício do aluno.

Os testes de `src/lib/__tests__/admin-users-sheet.test.tsx` falharam antes e passaram
com a correção. A primeira medição corrigida passou nas sete larguras, sem overflow
ou textos cortados, usando 97% da região em 1440 px e 98% em 1880 px.
Capturas locais em `output/playwright/` não são versionadas.

Validação automatizada conjunta com a correção da logo: 315 testes unitários
aprovados, TypeScript e lint sem erros. O roteiro de navegador também confirmou
abertura pelo teclado, busca, filtros de role/polo, estado vazio e formulário
fictício de aluno nas sete larguras. Não substitui teste em celular físico.

Não testar exclusão nem redefinir senhas de usuários reais para validar aparência.
Encerrar o servidor local e o navegador de teste ao finalizar. Em deploy, preservar
o overlay WhatsApp e executar os smokes de acesso. Não há migration nesta mudança.

## Entrega verificada — 14/09/2026

Commits `7bbc509` (usuários) e `e7d7a56` (logo do rodapé) enviados ao GitHub e
publicados no Oracle. `npm run build` local e `docker compose build app
audit-server-smoke` no servidor concluíram com sucesso. Publicação com
`docker compose up -d --no-deps --force-recreate --wait --wait-timeout 90 app`,
preservando o overlay e sem recriar banco ou worker.

Depois do deploy: smoke servidor (11 verificações), autenticação (34) e avatar
(1), todos com saída 0. Usados comandos SSH separados com
`docker compose --profile tools run --rm --no-deps -T audit-server-smoke`,
acrescentando `npm run audit:auth-smoke` e `npm run audit:avatar-smoke` nos dois
últimos. A verificação visual administrativa usa somente fixtures locais, não
contas reais; o smoke de acesso usa o fluxo isolado existente de teste.

O roteiro `scripts/site-footer-layout-check.cjs` confirmou no domínio publicado
a marca estática completa e contida em 320, 390, 768, 1024, 1440 e 1880 px,
incluindo hover. O corte anterior de 122,5 px em caixa de 84 px foi eliminado.
Imagem de rollback preservada como `candy-english-app:before-users-e7d7a56`.
