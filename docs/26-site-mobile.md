# Site público — mobile e abertura Candy

## Direção aprovada pelo pedido (13/09/2026)

Candy em movimento: título legível, bastante espaço livre e vídeos preservados em
uma moldura rosa/coral criada no Canva. Roxo `#412a4c`, rosa `#e57cd8`, pêssego
`#fce5d8`, papel `#fefbfa`. Corpo com a fonte existente e fallback local; destaque
editorial em Georgia itálica. Espaçamento 8/16/24/32/48/64 px; botões de ao menos
44 px, contraste alto, movimento reduzido respeitado.

Uma coluna até tablet; texto e mídia lado a lado apenas quando houver espaço.
Texto permanece HTML editável pelo conteúdo administrativo, nunca gravado na arte.
Preservar vídeos, fotos, links, menu acessível, Catty e contato WhatsApp.

## Regressões reproduzidas

- Frame com `min-height` e proporção gerava 1000 px dentro de 728 px em tablet.
- Logo fixa de 320/400 px causava overflow no rodapé em 320/360 px.
- Indicadores tinham apenas 10 px de altura; h1 existia somente para leitor de tela.
- Widgets sobrepunham controles; fontes externas e vídeo remoto eram bloqueados pela CSP.

## Aceite e validação

- 320, 390, 768, 1024 e 1440 px sem corte ou rolagem horizontal.
- Menu, foco/Escape, carrossel, vídeo/som, pausa e redução de movimento funcionando.
- Login e contato públicos legíveis, sem envio de formulário nos testes.
- `scripts/site-mobile-check.cjs` é uma expressão para `playwright-cli run-code`;
  executa medições reais no navegador já aberto, sem autenticar ou enviar mensagens.
- Sem alteração de banco, permissões, financeiro ou canal WhatsApp.

## Implementação

- `home-hero.tsx` e `home-hero.module.css`: um único carrossel, conteúdo HTML visível,
  moldura fluida e duas colunas somente a partir de 1024 px. Vídeos/fotos preservados.
- `home-banner-carousel.tsx`: alvos de 44 px, pausa da rotação explícita e pausa ao
  selecionar slide ou focar seus controles. Slides inativos continuam `inert`.
- `site-header.tsx`: marca estática legível desde o primeiro frame e botões mobile
  de 44 px. Menu e permissões de navegação preservados.
- `site-footer.tsx`: logo limitada ao espaço disponível e links sem overflow.
- `globals.css`, `catty-widget.tsx`, `whatsapp-widget.tsx`: ferramentas públicas
  compactas, balões espontâneos ocultos em mobile/tablet, aviso solicitado por
  toque preservado; widgets ocultos ao focar campos do conteúdo principal.
  `login-experience.tsx` marca o formulário público para a mesma proteção de foco.
  Na home, balões espontâneos também ficam ocultos no desktop para não cobrir o vídeo.
- `page.tsx`: vídeos decorativos reutilizam o componente institucional existente,
  que limita execução por viewport, visibilidade e preferência de movimento.
- Import remoto de fontes removido porque já era bloqueado pela CSP. Nenhum
  domínio ou `unsafe-eval` foi liberado. AVA continua usando o fallback existente.

## Arte Canva

Design novo: [Candy English — moldura vídeos mobile 2026](https://www.canva.com/design/DAHVF737lBc/1N2EWoGuCtv8ujgVOCCUBw/edit).
Composição 1600 × 1200, fundo `Purple Orange Gradient with Waves Background`.
O download PNG retornou `ERR_BLOCKED_BY_CLIENT` no Chrome; nenhuma proteção foi
desativada. A prévia renderizada do próprio design (516 × 387) foi obtida pelo
inventário de assets e otimizada em `public/brand/candy-video-frame-canva.webp`
(4368 bytes). É textura decorativa, sem texto; títulos e controles ficam no HTML.
O original permanece editável no Canva. Não foram alterados designs anteriores.

## Evidências e limites

Regressão falhou antes nos cortes de 320/768 px, h1 oculto e indicadores pequenos;
passou após o ajuste nas cinco larguras especificadas. Em desenvolvimento, a CSP
impede o runtime React Refresh (`unsafe-eval`), portanto a interação deve ser
validada com `next build` / `next start`, sem relaxar a segurança.

Validação local: 313 testes, TypeScript, lint sem erros e build aprovado. Na versão
de produção local, menu/Escape, troca de slides, pausa, reprodução/som e movimento
reduzido foram exercitados. Login local depende do banco, ausente nessa execução;
o formulário foi validado no candidato Oracle e novamente no domínio público.

Publicação verificada no Oracle: implementação `d574575`, imagem
`sha256:80e3c19905c3bd960f02432fae58aa52c8906582147f219dabcb21ae209c8892`.
O app publicado usa a mesma imagem validada no candidato. O overlay WhatsApp foi
preservado; app, worker Catty e bancos permaneceram saudáveis. Nenhuma migration,
mudança de permissões ou mensagem WhatsApp foi necessária nesta tarefa.

Verificação no domínio público:

- Home: `scrollWidth` igual à viewport em 320, 390, 768, 1024 e 1440 px;
  carrossel contido, título visível, controles de 44 px, pausa, slides e menu/Escape.
- `/sobre`, `/metodologia`, `/planos`, `/contato` e `/ava/login`: HTTP 200 e
  largura de documento de 320 px em viewport de 320 px.
- Foco no e-mail do login oculta os dois widgets públicos; não houve envio de
  formulário na verificação visual. Vídeos carregaram sem erro de mídia.
- Smokes de servidor, autenticação e avatar concluídos com código de saída 0.

Comandos de validação/publicação: `tsc --noEmit`,
`eslint src scripts/site-mobile-check.cjs`, `npm run build`,
`playwright-cli run-code` com a expressão de `scripts/site-mobile-check.cjs`,
`docker compose up -d --no-deps --force-recreate --wait --wait-timeout 90 app` e
`docker compose --profile tools run --rm --no-deps -T audit-server-smoke`
(também com `npm run audit:auth-smoke` e `npm run audit:avatar-smoke`). Executar os
smokes por comandos SSH separados; Compose interativo pode consumir o restante
de um script recebido via stdin, criando uma falsa impressão de validação.

As capturas de conferência ficam localmente em `output/playwright/`, fora do Git.
O candidato temporário foi removido após a publicação, sem apagar volumes; o
túnel SSH e os servidores locais de teste foram encerrados. A imagem anterior
`candy-english-app:before-mobile-d574575` foi preservada para reversão.
Limite: emulação Chromium não substitui teste em aparelho físico, Safari/iOS e
teclado virtual. Essa conferência em dispositivo real continua pendente.
