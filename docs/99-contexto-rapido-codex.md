# 99 - Contexto Rapido para Codex

## Para que serve

Este documento existe para reduzir o prompt necessario ao continuar o projeto Candy English em outro chat. Ele nao substitui `AGENTS.md`, `README.md` nem os docs oficiais; ele aponta o caminho rapido e registra o estado operacional recente.

## Prompt minimo para novo chat

Use este prompt e complete apenas o pedido:

```text
Estou no projeto Candy English em C:\Projetos\candy-english.
Leia AGENTS.md, README.md e docs/99-contexto-rapido-codex.md.
Depois execute meu pedido seguindo os padroes do projeto: [meu pedido aqui]
```

## Roteiro automatico esperado

Ao receber o prompt minimo, o agente deve:

1. Ler `AGENTS.md`, `README.md` e este arquivo.
2. Ler os docs especificos do modulo antes de alterar arquivos.
3. Usar `rg` para localizar codigo e referencias.
4. Fazer mudancas pequenas, rastreaveis e reversiveis.
5. Atualizar documentacao quando houver mudanca de fluxo, regra, permissao, layout importante, banco, deploy ou integracao.
6. Rodar validacoes proporcionais ao risco.
7. Fazer commit e push quando a implementacao estiver concluida, salvo pedido contrario.
8. Fazer pull/deploy Oracle por conta propria quando a mudanca precisar ir para producao e houver acesso operacional.
9. Se nao houver SSH, chave, sessao remota ou permissao para acessar o Oracle, informar o bloqueio exato e deixar os comandos PuTTY de deploy.
10. Finalizar em portugues com arquivos alterados, docs, comandos, validacoes, pendencias, riscos, commit/push e deploy.

## Estado atual resumido

- Site institucional e AVA proprio em `/ava`.
- Roles atuais: `ADMIN`, `TEACHER` e `STUDENT`.
- Admin gerencia usuarios, redefinicao de senha, vinculos, contratos, financeiro, agenda, manutencao e cofre de APIs/senhas.
- Teacher cria aulas, homework interativo, materiais, feedback, mensagens, contratos e aula ao vivo.
- Student acessa aulas, homework, mensagens, contratos, perfil, avatar e aula ao vivo.
- Student ve Candy XP no resumo: nivel, barra amarela, fontes de XP, roadmap e slot visual para jogos futuros, calculado de forma derivada/read-only em `src/lib/candy-xp.ts`.
- Homework e aula interativa usam PDF/imagem original como fundo protegido.
- Teacher desenha campos manualmente sobre o arquivo.
- Campos do aluno ficam invisiveis; aparecem apenas texto, marcacoes e desenhos preenchidos.
- Campo de desenho funciona com mouse/dedo e permite desfazer o ultimo traco.
- Atividades criadas por `Criar aula` aparecem em `Aulas e Materiais`.
- Atividades criadas por `Criar homework` aparecem em `Responder homework`.
- Corrigir homework mostra o PDF com a entrega marcada e separa `Aguardando correcao` de `Corrigidos`.
- Itens de correcao ficam minimizados por padrao.
- Contratos PDF sao visualizados no AVA por rota protegida.
- Catty usa OpenAI quando configurada e fallback local quando nao ha chave.
- Header do site usa destaque forte no item de navegacao ativo.
- Home atual usa `public/brand/home-candy-2.mp4` como fundo do primeiro card dominante do hero em loop mudo, com palco menos horizontal, zoom leve e fundo branco reduzido quando sobra area.
- No hero da home, `intro-1.mp4` e `intro-2.mp4` ficam embutidos dentro desse mesmo primeiro card, no espaco livre do fundo, com borda suave, autoplay mudo, loop, fundo branco para evitar cortes e botoes visiveis para pausar/retomar e ligar/desligar som.
- O componente `src/components/site/home-hero-loop-video.tsx` garante autoplay mudo do video principal; `src/components/site/home-video-card.tsx` controla play/pause e som dos cards de intro.

## Docs mais usados por tipo de tarefa

- Arquitetura ou rotas: `docs/01-arquitetura.md`
- Banco, Prisma ou migration: `docs/02-banco-de-dados.md`
- Fluxos do AVA: `docs/03-fluxos-do-sistema.md`
- Padroes de codigo: `docs/04-padroes-de-codigo.md`
- Comandos, validacao e deploy: `docs/05-comandos.md`
- Pendencias conhecidas: `docs/06-pendencias.md`
- Decisoes tecnicas: `docs/07-historico-de-decisoes.md`
- Auth e permissoes: `docs/08-autenticacao-e-permissoes.md`
- Deploy/ambiente: `docs/09-deploy-e-ambiente.md`
- Financeiro: `docs/13-financeiro.md`
- Agenda: `docs/14-agenda.md`
- Homework/aula interativa: `docs/15-homework-interativo.md`
- Direcao visual: `docs/design-direcao.md`

## Comandos locais preferidos

No Windows, prefira `npm.cmd` para evitar bloqueio de PowerShell:

```powershell
npm.cmd run prisma:validate
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
```

## Deploy Oracle

O projeto oficial no servidor fica em:

```bash
/home/ubuntu/projetos/candy-english
```

Deploy sem migration:

```bash
cd /home/ubuntu/projetos/candy-english
git pull
docker compose build app audit-server-smoke
docker compose up -d --force-recreate app
sleep 45
docker compose ps
docker compose --profile tools run --rm audit-server-smoke
docker compose --profile tools run --rm audit-server-smoke npm run audit:auth-smoke
docker compose --profile tools run --rm audit-server-smoke npm run audit:avatar-smoke
```

Deploy com migration:

```bash
cd /home/ubuntu/projetos/candy-english
git pull
docker compose up -d postgres
docker compose build app migrate audit-server-smoke
docker compose --profile tools run --rm migrate
docker compose up -d --force-recreate app
sleep 45
docker compose ps
docker compose --profile tools run --rm audit-server-smoke
docker compose --profile tools run --rm audit-server-smoke npm run audit:auth-smoke
docker compose --profile tools run --rm audit-server-smoke npm run audit:avatar-smoke
```

## Cuidados permanentes

- Nunca expor segredos, `.env`, chaves, senhas ou valores revelados do cofre admin.
- Nunca versionar uploads, backups ou arquivos reais de ambiente.
- Nunca abrir PostgreSQL publicamente.
- Nunca reverter mudancas do usuario sem permissao explicita.
- Mudancas sensiveis devem validar `auth()`, role e permissao por dado no servidor.
- `STUDENT` acessa apenas o proprio perfil.
- `TEACHER` atua apenas sobre proprias aulas ou alunos vinculados.
- `ADMIN` pode supervisionar tudo, mas actions sensiveis ainda devem validar role no servidor.
