# Bom-dia da Catty no grupo Interno

## Escopo aprovado — 17/09/2026

O responsável autorizou a rotina diária às 08:00, em `America/Sao_Paulo`,
as tabelas aditivas e um único envio atrasado em 17/09. Somente o grupo Interno,
conferido por identificador exato no transporte. Conversas privadas permanecem
pausadas. Esta autorização não libera cobranças, agenda ou respostas no grupo.

## Contrato e cuidados

- Texto 100% em inglês: saudação/dia da semana calculados no servidor, corpo de
  2–4 frases naturais, simples e encorajadoras, um emoji. Aberturas, temas e
  emojis usam ciclos não semanais; a IA recebe até 30 mensagens anteriores
  desta rotina para evitar repetição. Fins de semana não pressupõem aulas.
- GPT-5.4 do canal, sem alterar a Catty do AVA. No máximo duas gerações de
  320 tokens por execução, timeout de 12 segundos por chamada, `store=false`.
  Saída validada, sem URLs, dados pessoais ou acesso a ferramentas/AVA.
  Falha da IA fica registrada; não enviar fallback semanal repetitivo.
- Worker do servidor, sem depender do navegador/PC. Reserva persistente única
  por data antes da geração; revalida autorização antes do transporte. Aceite
  da API não comprova entrega/leitura. Interrupção durante envio vira incerta,
  sem retry automático. Não há promessa de exactly-once no WhatsApp externo.
- Janela diária 08:00–08:15; sem repor dias perdidos. A exceção de hoje tem
  autorização/data e validade curta próprias, mas usa a mesma chave diária.
- Ativação e pausa explícitas, exclusivas ADMIN ativo, com versão esperada,
  auditoria e histórico em `/ava/rotina`. A pausa individual não altera a
  rotina; os controles têm nomes diferentes para não sugerir pausa global.
- Grupo cifrado; conteúdo gerado sem dados pessoais cifrado por até 45 dias
  para variação e conferência. Nenhuma mensagem recebida do grupo entra na IA.
- Testes nunca enviam para contatos reais. Integração usa schema isolado,
  IA/transporte falsos e limpeza das fixtures. O envio real atrasado é uma
  ação explicitamente autorizada, somente depois das validações.

## Entrega verificada — 17/09/2026

Implementação publicada no Oracle (`175e2d4`, precedido por `2c7fee3`). Backup
cifrado conferido antes da migration aditiva `20260917130000_catty_morning`;
imagem anterior preservada como `candy-english-app:before-morning-175e2d4`.
Build das imagens app/migrate/tools concluído, app saudável e overlay WhatsApp
preservado. A rotina está ativa no grupo Interno; conversas privadas continuam
pausadas. A ativação não alterou destinatários nem dados financeiros/agenda.

- Envio atrasado autorizado de 17/09: uma única reserva, `SENT`, aceite do
  transporte registrado, sem erro. Registro criado às 18:29:44 de São Paulo.
  Isso não confirma entrega ou leitura. Não executar novo envio de teste.
- Próxima execução configurada para 18/09/2026 às 08:00, `America/Sao_Paulo`
  (`2026-09-18T11:00:00.000Z`), seguindo diariamente inclusive fins de semana.
- Validações locais: Prisma generate/validate, `tsc --noEmit`, ESLint em `src`
  e scripts novos aprovados; 336 testes gerais/mobile e um teste adicional de
  transporte aprovados. Build Next.js aprovado na imagem Docker.
- Integração isolada: 12 verificações novas e 14 verificações da fila existente
  aprovadas. Cobrem concorrência, duplicação, versão, roles, revogação durante
  geração, troca de identidade do grupo, entrega incerta, falha da IA, prazo
  tardio, recuperação e retenção. Rede real bloqueada; zero schemas temporários
  restantes após limpeza.
- Smokes de produção: servidor 11 OK, autenticação 34 OK e avatar OK. Google
  OAuth não configurado, portanto o cenário correspondente foi ignorado.
- QA visual com dados sintéticos e ações sem acesso real: 320, 768, 1024 e
  1440 px, sem overflow horizontal ou cortes de texto; confirmação/cancelamento
  por teclado e movimento reduzido conferidos, sem erros de página. Navegador
  e servidor temporários encerrados; nenhum controle real foi acionado no QA.

Arquivos principais: `src/lib/catty-whatsapp/morning-*.ts`, validação e testes
`catty-morning*`, transporte e worker existentes, controles/painel de bom-dia e
actions/página de `/ava/rotina`, schema/migration Prisma e os scripts
`catty-morning-admin.ts` e `catty-morning-smoke.ts`. Documentação atualizada em
`AGENTS.md`, `README.md` e `docs/02`, `07`, `24`, `28` e `99`.

## Operação e rollback

- Pausar em `/ava/rotina` antes de rollback ou restauração de backup. Voltar a
  imagem anterior preservando as tabelas aditivas. Não executar migration de
  remoção em produção. Reativação é explícita e não repõe dias perdidos.
- A implantação não cadastra/ativa destinatário automaticamente. O operador
  usa `scripts/catty-morning-admin.ts --enable --actor-email <ADMIN> --confirm`.
  `--send-today` é uma exceção operacional que exige pedido explícito; a mesma
  data não é reenviada mesmo que o comando seja repetido. Sem JIDs no Git.
- Para controles posteriores, preferir `/ava/rotina`. A execução do script
  exige acesso ao banco e à rede `candy-english_catty-channel`. O serviço
  `audit-server-smoke` isoladamente não tem a segunda rede: retorna
  `TRANSPORT_UNAVAILABLE` antes de ativar/enviar. Na publicação foi usado um
  container operacional temporário conectado às duas redes e removido ao fim;
  não expor o transporte nem alterar a pausa privada para contornar esse erro.
- Validar migration e concorrência com `npx tsx scripts/catty-morning-smoke.ts
  --isolated-schema`; rede real bloqueada e fixtures removidas em `finally`.
- Antes de publicar: backup, build, migration, recriar somente o app preservando
  overlay WhatsApp e executar smokes de servidor/auth/avatar. Só então ativar.
- Auditoria de dependências em 17/09: 0 críticas, 12 altas preexistentes em
  tooling ESLint/Prisma e transitivas. Este incremento não altera dependências
  nem passa entrada externa a glob/configuração ou MySQL; usa PostgreSQL.
  Manter revisão das transitivas até 20/09, sem `audit fix --force` nesta tarefa.
