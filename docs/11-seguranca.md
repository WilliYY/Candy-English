# Seguranca e defesa em camadas

## Objetivo

Este documento registra o que protege o Candy English, o que depende da infraestrutura externa e como verificar cada controle. Nenhuma camada isolada impede todo ataque; o objetivo e reduzir superficie, limitar abuso, detectar incidente e recuperar o servico sem perder dados.

## Estado dos 15 controles

| # | Controle | Estado | Evidencia e proxima barreira |
|---|---|---|---|
| 1 | Protecao contra DDoS | Externo pendente | O app fica atras do proxy Oracle, mas absorcao de ataque volumetrico exige CDN/anti-DDoS antes do servidor. Ativar Cloudflare ou equivalente sem expor o IP de origem. |
| 2 | WAF | Externo pendente | CSP e validacao no app nao substituem WAF. Ativar regras gerenciadas OWASP no provedor de borda, primeiro em modo de observacao. |
| 3 | Rate limiting | Parcial | Login web/mobile e reautenticacao do 2FA limitam 8 falhas por conta e 30 por origem em 15 minutos. Limite geral por rota/IP deve ser feito na borda para nao sobrecarregar o Node. |
| 4 | Brute force e credential stuffing | Implementado no login | Resposta generica, hash ficticio para email inexistente, locks transacionais, limite por conta/origem e MFA opcional para Admin. Alertas agregados usam `LoginAttempt`. |
| 5 | MFA/2FA de administradores | Implementado, adesao manual | Cada Admin ativa TOTP em `Seguranca e acessos`; segredo cifrado, recuperacoes em HMAC, anti-replay e reautenticacao limitada. Nao forcar antes de todos guardarem recuperacoes. |
| 6 | Controle de acesso e permissoes | Implementado no app | `auth()` e role sao validados nas actions/rotas, com autorizacao por dado para aluno/teacher/admin. UI escondida nunca e a unica barreira. |
| 7 | Protecao das APIs | Parcial forte | Rotas privadas autenticam, validam payload com Zod, limitam login e evitam IDs livres. WAF/rate limit de borda e inventario periodico continuam necessarios. |
| 8 | SQL Injection, XSS e CSRF | Implementado por padrao, revisar continuamente | Prisma parametriza consultas, React escapa texto, Auth.js protege o fluxo de credenciais e CSP reduz impacto de XSS. Toda query raw, HTML injetado e nova action exigem revisao. |
| 9 | Sessoes e cookies | Implementado | Auth.js usa sessao assinada, cookies seguros em HTTPS e `sessionVersion` para revogacao; sessoes moveis guardam hashes e possuem rotacao/revogacao. |
| 10 | Banco nao exposto | Implementado no Compose | PostgreSQL nao publica porta no host; somente a rede Docker acessa. O app publica em `127.0.0.1` por padrao. Firewall Oracle deve manter 5432 fechado. |
| 11 | Senhas, chaves e `.env` | Implementado no repositorio | `.env`, `private/`, segredos e uploads sao ignorados. Senhas usam bcrypt; cofre e TOTP usam cifra autenticada; respostas/logs nao exibem valores. Segredos reais ficam apenas no servidor. |
| 12 | Logs, monitoramento e alertas | Implementado local; notificacao configuravel | `monitor-production.sh` verifica health, containers, disco, backup e pico de falhas. Cron envia ao journal; webhook HTTPS opcional entrega alerta externo. |
| 13 | Backup e recuperacao | Implementado local; copia externa pendente | Backup cifra banco+storage, valida checksums e possui restore drill isolado. Ainda e obrigatoria uma copia externa/imutavel com credencial e retencao proprias. |
| 14 | Dependencias e correcoes | Automatizado | CI valida schema, testes, tipos, lint, build e bloqueia vulnerabilidade critica. Dependabot abre atualizacoes semanais. Alertas presos ao Prisma nao devem ser resolvidos por downgrade forcado. |
| 15 | Pentest periodico | Processo externo pendente | Contratar teste autenticado ao menos anual e apos mudanca importante em auth, financeiro ou upload. Corrigir por severidade e repetir o teste das falhas encontradas. |

## Monitoramento no Oracle

O script `scripts/monitor-production.sh` nao altera dados. Ele retorna `0` quando tudo esta normal e `1` quando encontra indisponibilidade, container parado, disco alto, backup antigo ou muitas falhas de login.

Preparacao opcional de alerta externo, sem versionar o endpoint:

```bash
cd /home/ubuntu/projetos/candy-english
install -d -m 700 private
install -m 600 /dev/null private/monitor.env
nano private/monitor.env
```

Conteudo do arquivo privado:

```dotenv
CANDY_ALERT_WEBHOOK_URL="https://endpoint-seguro-fornecido-pelo-operador"
```

Teste manual:

```bash
./scripts/monitor-production.sh
```

Cron a cada cinco minutos:

```cron
*/5 * * * * flock -n /tmp/candy-monitor.lock bash -lc 'cd /home/ubuntu/projetos/candy-english && ./scripts/monitor-production.sh' 2>&1 | logger -t candy-monitor
```

Variaveis opcionais: `CANDY_PUBLIC_HEALTH_URL`, `CANDY_BACKUP_DIR`, `CANDY_MAX_BACKUP_AGE_HOURS`, `CANDY_MAX_DISK_PERCENT`, `CANDY_LOGIN_FAILURE_ALERT_THRESHOLD`, `CANDY_ALERT_REPEAT_MINUTES`, `CANDY_MONITOR_STATE_DIR` e `CANDY_MONITOR_ENV_FILE`.

## Protecao de borda ainda necessaria

Cloudflare ou servico equivalente precisa ser configurado fora do repositorio:

1. proxy DNS somente para o site, mantendo email e outros registros intactos;
2. SSL estrito ate o Oracle;
3. regras gerenciadas de WAF em observacao antes de bloquear;
4. rate limit especifico para login e rotas publicas de escrita;
5. bloqueio do acesso direto ao Oracle, aceitando HTTP/HTTPS apenas pelos IPs da borda quando operacionalmente seguro;
6. alerta de picos 4xx/5xx e trafego anormal.

Alterar nameserver, firewall ou IP de origem sem acesso de recuperacao pode derrubar o site. Essa etapa exige acesso ao DNS/Cloudflare e deve ter rollback testado.

## Rotina minima

- A cada 5 minutos: monitor de health/containers/disco/backup/login.
- Diariamente: backup criptografado e verificacao.
- Semanalmente: restore drill e triagem do Dependabot/auditoria.
- Mensalmente: revisar usuarios Admin, 2FA, portas publicas, logs e restaurabilidade externa.
- Anualmente ou apos mudanca critica: pentest autenticado independente.

## Resposta a incidente

1. preservar logs e estado antes de reiniciar;
2. revogar sessoes/credenciais afetadas e conter a origem na borda;
3. confirmar integridade de banco, uploads e ultimo backup;
4. corrigir a causa com mudanca rastreavel e validar smokes;
5. restaurar somente por ambiente/volume novo quando houver suspeita de corrupcao;
6. registrar linha do tempo, alcance, dados afetados e medidas preventivas.
