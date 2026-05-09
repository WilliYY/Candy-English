# Checklist de Producao

Este checklist adapta para o Candy English os pontos operacionais robustos usados como referencia no SavePointFinance: healthcheck, logs rotacionados, smoke test, deploy com migration e verificacao pos-deploy.

## Deploy Padrao

Use quando nao houver mudanca no schema do Prisma:

```bash
cd /home/ubuntu/projetos/candy-english
git pull
docker compose build app audit-server-smoke
docker compose up -d --force-recreate app
sleep 45
docker compose ps
docker compose logs --tail=100 app
docker compose --profile tools run --rm audit-server-smoke
```

## Deploy Com Migration

Use quando houver alteracao em `prisma/schema.prisma` ou em `prisma/migrations/`:

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
```

## Admin Inicial

Rode o seed somente para criar o primeiro admin:

```bash
docker compose run --rm seed
```

Por padrao, o seed nao redefine senha de admin existente. Para redefinir explicitamente:

```bash
ADMIN_RESET_PASSWORD=true docker compose run --rm seed
```

## O Que Validar

- `candy-english-postgres` saudavel.
- `candy-english-app` saudavel.
- Logs do app sem falha de boot.
- `/api/health` retorna status 200.
- `/ava/login` carrega.
- `/ava/admin` sem sessao redireciona para `/ava/login`.
- Smoke test termina com `Candy English server smoke OK`.
- Admin consegue entrar depois do deploy.
- Teacher e student continuam sendo redirecionados para suas areas corretas.
- Usuario desativado em `/ava/admin` nao consegue fazer login.
- Vinculo aluno-teacher aparece no painel admin.
- Volume `app-storage` existe para preservar fotos e contratos.
- Aula ao vivo abre link do Google Meet apenas para usuario logado.

## Comandos Uteis

```bash
docker compose ps
docker compose logs --tail=100 app
docker compose logs --tail=100 postgres
docker compose --profile tools run --rm audit-server-smoke
```

## Porta Do App

Em producao, mantenha:

```env
APP_HOST_BIND=127.0.0.1
APP_PORT=3000
AUTH_URL=https://candyenglish.com.br
NEXTAUTH_URL=https://candyenglish.com.br
```

Assim o app fica acessivel para o proxy reverso local, mas nao diretamente pela porta `3000` publica do servidor.

## Uploads

O servico `app` usa o volume Docker `app-storage` em `/app/storage`.

```bash
docker volume ls | grep candy
docker compose exec app ls -la /app/storage
```

Nao apague esse volume se houver contratos ou fotos enviados.

## Termos Rapidos

- `build`: cria a imagem Docker nova a partir do codigo.
- `migration`: aplica mudancas de estrutura no banco.
- `seed`: cria ou preserva o admin inicial.
- `health`: teste automatico de saude do container.
- `smoke test`: teste curto que confirma se as paginas essenciais respondem.
