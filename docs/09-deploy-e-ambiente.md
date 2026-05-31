# 09 - Deploy e Ambiente

## O que esta parte do sistema faz

Este documento descreve ambientes, Docker, deploy Oracle e cuidados operacionais.

## Arquivos, rotas, componentes, tabelas ou servicos envolvidos

Arquivos:

- `.env.example`
- `Dockerfile`
- `docker-compose.yml`
- `next.config.ts`
- `prisma.config.ts`
- `scripts/server-smoke.ts`
- `scripts/auth-smoke.ts`
- `scripts/avatar-smoke.ts`

Servicos:

- `app`
- `postgres`
- `migrate`
- `seed`
- `audit-server-smoke`

Servidor oficial:

- `/home/ubuntu/projetos/candy-english`

Operacao por agente:

- Quando uma mudanca ja estiver em commit/push e precisar aparecer em producao, o Codex deve tentar fazer o pull/deploy no Oracle por conta propria se houver acesso operacional disponivel.
- Se o ambiente atual nao tiver SSH, chave, sessao remota ou permissao para acessar o Oracle, o Codex deve reportar esse bloqueio exato e deixar os comandos PuTTY de deploy.
- Nao considerar deploy concluido sem validar o pull/recreate e, quando possivel, conferir a pagina ou smoke correspondente.

## Regras de negocio que precisam ser preservadas

- `.env` real nunca deve ir para o Git.
- PostgreSQL deve permanecer interno.
- Uploads persistem no volume `app-storage`.
- `private/secrets` e `private/backups` ficam fora do Git quando existirem.
- Deploy com migration deve aplicar migration antes de recriar o app.
- `OPENAI_API_KEY` e opcional; quando existe, ativa a Catty com OpenAI e tambem pode ser usada pelo OCR opcional de homework. Sem a chave, a Catty usa fallback local e homework segue manual.
- `OPENAI_CATTY_MODEL` define o modelo da Catty, com fallback para `gpt-5.4-nano`.
- `NEXT_PUBLIC_LIVE_CLASS_JITSI_DOMAIN` define o dominio Jitsi usado pelo embed de aula ao vivo. Como e variavel publica e lida no build, trocar o dominio exige rebuild/recreate do app.
- `ADMIN_CREDENTIALS_SECRET` e opcional e protege o cofre admin de APIs/senhas; se ficar vazio, o cofre usa `AUTH_SECRET`. Depois que houver credenciais salvas, trocar esse segredo exige plano de rotacao.
- O cofre admin sincroniza para o banco apenas integracoes externas existentes no `.env`: OpenAI, Google OAuth e dominio Jitsi. Nao sincronizar variaveis internas como `DATABASE_URL`, `AUTH_SECRET`, Postgres ou senha seed.

## Decisoes tecnicas tomadas

- O app publica porta em `APP_HOST_BIND`, por padrao `127.0.0.1`.
- `HOSTNAME=0.0.0.0` dentro do container permite healthcheck e acesso pela rede Docker.
- Docker usa healthcheck em `/api/health`.
- Logs Docker usam rotacao `max-size=10m` e `max-file=3`.
- Containers possuem limites/reservas de memoria.
- `next.config.ts` define Server Actions com limite de 15 MB para upload de homework interativo.
- O app corrige permissao de `/app/storage` no boot e roda Next como `nextjs`.
- Homework interativo usa o mesmo volume `app-storage` para `storage/homework-assets`.
- A imagem de ferramentas (`migrate`, `seed`, `audit-server-smoke`) gera o Prisma Client no build para que scripts de smoke e seed encontrem `src/generated/prisma/client`.
- Aula ao vivo usa `NEXT_PUBLIC_LIVE_CLASS_JITSI_DOMAIN` para montar novas salas e liberar camera/microfone/display capture no `Permissions-Policy`.
- Catty chama OpenAI apenas pelo servidor em `/api/catty/chat`; a chave nunca deve ir para o client.
- O painel `/ava/admin?task=apis-senhas` salva valores em `AdminCredential` criptografados no banco; a revelacao acontece apenas por server action protegida.

## Riscos ao alterar esta parte

- Publicar `5432` pode expor o banco.
- Apagar volumes remove banco ou uploads.
- Rodar `seed` com `ADMIN_RESET_PASSWORD=true` sem intencao pode trocar senha.
- Pular migration pode quebrar paginas que dependem de tabelas novas.
- Ativar OpenAI sem revisar custo, privacidade e volume pode gerar despesa; Catty tem limite simples por IP, mas volume alto pede rate limit dedicado.
- Perder ou trocar `ADMIN_CREDENTIALS_SECRET`/`AUTH_SECRET` pode impedir leitura de credenciais ja criptografadas.
- Alterar headers pode afetar Jitsi ou seguranca basica.
- Usar `meet.jit.si` publico em embed pode exigir login do criador e limitar a chamada; para producao sem conta externa, configurar Jitsi dedicado/JaaS e atualizar o dominio no ambiente.

## Pendencias

- Rotina formal de backup e restore.
- Checklist de rollback.
- CI remoto documentado.
- Monitoramento externo de disponibilidade e erros.

## Como pode evoluir

- Criar `docs/11-seguranca.md`.
- Criar rotina de backup versionada fora do Git.
- Adicionar CI/CD com build, lint, typecheck e smokes.
- Documentar proxy reverso quando a configuracao final estiver estabilizada.
