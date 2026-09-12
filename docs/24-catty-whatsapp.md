# Catty no WhatsApp — especificação da primeira versão

Status em 11/09/2026: implementação autorizada pelo usuário ao pedir continuidade
após a apresentação desta proposta. Tabelas e serviços exclusivos aprovados;
pareamento e ativação permanecem separados da instalação.

## Objetivo e escopo

Disponibilizar a Catty no WhatsApp para uso interno e poucos contatos externos
autorizados. Reaproveitar os padrões comprovados do Miauby, sem copiar seu domínio
de farmácia nem compartilhar sua sessão, credenciais, filas ou banco.

A primeira versão terá painel administrativo, conexão por QR Code, pausa geral,
contatos autorizados, conversa textual com a Catty e envio manual individual.
Comandos de negócio serão definidos posteriormente pelo usuário neste projeto.
Não haverá acesso a financeiro, contratos, alunos, senhas ou ações do AVA pelo
WhatsApp nesta etapa. O telefone não confere uma role do AVA.

## Arquitetura proposta

WhatsApp → Evolution API exclusiva da Candy → webhook autenticado do Candy →
fila persistente → resposta textual da Catty → envio pela Evolution API.

- Next.js 15, TypeScript, Prisma 7 e PostgreSQL 17 existentes.
- Painel `/ava/whatsapp`, acessível apenas por `ADMIN`, com atalho na seção Catty.
- Actions validam sessão, role e conta ativa no servidor a cada operação.
- Modelos `CattyWhatsapp*` isolam contatos, estado operacional e mensagens da
  Catty dentro do banco Candy. Migration exclusivamente aditiva.
- Evolution API e worker em serviços Docker separados, com limites de recursos,
  credenciais e volumes próprios. Banco do transporte não exposto publicamente.
- Integração desligada por padrão. Pareamento e ativação são ações explícitas;
  conectar o número não deve liberar automaticamente as respostas.
- Usar APIs HTTP e bibliotecas já instaladas; não adicionar dependências npm
  nesta etapa sem necessidade demonstrada.
- Reutilizar personalidade e regras seguras da Catty por uma entrada própria
  de canal. Não simular login ou chamar o handler autenticado com usuário fictício.
- Históricos web/mobile e WhatsApp permanecem separados. Nenhuma memória pessoal
  de aluno ou informação interna do AVA é enviada ao provedor de IA.

## Comportamento e limites

1. Admin cadastra um contato com nome, telefone internacional e confirmação de
   autorização para receber mensagens. O contato pode ser bloqueado depois.
2. Somente mensagens textuais recentes de contatos autorizados entram na fila.
   Ignorar grupos, status, mensagens próprias, eventos de outra instância,
   sincronizações antigas, anexos e contatos desconhecidos.
3. Mensagens repetidas do provedor não geram uma nova resposta. Identificador de
   instância e identificador da mensagem compõem a chave de deduplicação.
4. Processamento limitado por contato e globalmente, com fila pequena e prazo de
   validade. Um contato não pode consumir toda a capacidade da Catty.
5. Antes de qualquer envio, revalidar pausa geral e autorização do destinatário.
   Não enviar automaticamente toda uma fila antiga ao reativar o canal.
6. Envio manual exige destinatário autorizado, texto, confirmação e identificador
   de operação contra clique duplicado. Não criar disparos em massa.
7. Pedido de interrupção do destinatário bloqueia novos envios; não depender da
   IA para reconhecer essa ação. A UI deixa o bloqueio e seu motivo visíveis.
8. Em timeout após tentativa de envio, registrar entrega incerta para verificação,
   sem repetir automaticamente e arriscar duplicidade. Não prometer exactly-once
   em uma integração externa sem suporte transacional do provedor.
9. QR Code é temporário e visível somente ao admin; não vai para logs, auditoria
   persistente ou documentação. Status e erros são sanitizados.
10. Sem áudios, imagens, cobranças, lembretes agendados ou comandos operacionais
    nesta primeira versão. Novos comandos terão permissão e testes próprios.

## Proteção e retenção propostas

- Webhook com segredo exclusivo, verificação em tempo constante e limite de
  tamanho do corpo antes do parsing. Não transportar o segredo na query string.
- Worker com autenticação interna distinta; não usar a sessão do navegador.
- Telefones e conteúdo persistido criptografados com AES-256-GCM; hash com chave
  para busca do telefone; exibição mascarada na listagem administrativa.
- Segredos apenas no ambiente/cofre autorizado; nunca no cliente ou Git.
- Proposta de retenção: conteúdo das conversas por até 24 horas; metadados
  mínimos de entrega e auditoria por até 30 dias. Deduplicação e validade dos
  eventos devem continuar seguras depois da limpeza. Contatos autorizados
  persistem até remoção administrativa, sem reaproveitar autorização expirada.
- Logs não registram texto das conversas, telefone completo, QR ou respostas
  integrais dos serviços externos. Auditoria registra ação, autor e horário.
- Avisar sobre o uso de IA e oferecer interrupção das mensagens. A política de
  privacidade deve descrever o canal antes da ativação.

## Estrutura prevista e estilo

- `src/lib/catty-whatsapp/`: domínio, transporte, fila e geração de resposta.
- `src/lib/validations/`: validações Zod de entrada administrativa.
- `src/lib/__tests__/catty-whatsapp-*.test.ts`: testes unitários com `node:test`.
- `src/app/api/catty/whatsapp/`: webhook e endpoint interno do worker.
- `src/app/ava/whatsapp/`: página e actions administrativas.
- `src/components/ava/`: componentes do painel seguindo a direção visual Candy.
- `prisma/`: modelos e migration aditiva.
- `scripts/`: worker e smoke com fixtures temporárias.
- `ops/`: configuração Docker isolada do transporte.

Seguir Server Components para leitura, server actions para escrita, `getPrisma()`
para banco e validação explícita de autorização. Exemplo de contrato pretendido:

```ts
type CattyWhatsappResult =
  | { ok: true; message: string }
  | { ok: false; message: string };
```

Nenhum erro retornado ao cliente deve incluir o objeto bruto do provedor.

## Critérios de aceite e testes

- Admin acessa o painel; anônimo, aluno, professor e admin desativado não gerenciam
  o canal, nem por acesso direto às actions.
- Configuração incompleta ou canal pausado não provoca chamadas de envio.
- QR funciona com o contrato da versão Evolution selecionada; a sessão Miauby
  permanece intocada. Validar o transporte com mock antes do pareamento real.
- Duplicação, concorrência, bloqueio, opt-out, limite, atraso e retomada não
  provocam envios extras. Testes de falha distinguem erro certo de entrega incerta.
- Conteúdo criptografado não aparece em colunas de texto simples ou logs.
- Painel legível em celular e desktop, navegação por teclado, estados vazio,
  carregando e erro, sem botões encobertos pela Catty.
- Fluxos de login, Catty web/mobile, financeiro e vendas continuam passando nos
  testes existentes. Nenhum teste envia WhatsApp ou altera movimentações reais.

Comandos existentes de validação:

```bash
npx tsx --test src/lib/__tests__/catty-whatsapp-*.test.ts
npm run test:mobile-homework
npm run test:mobile-auth
npm run prisma:validate
npm run typecheck
npm run lint
npm run build
docker compose --profile tools run --rm audit-server-smoke
docker compose --profile tools run --rm audit-server-smoke npm run audit:auth-smoke
docker compose --profile tools run --rm audit-server-smoke npm run audit:avatar-smoke
```

O comando de teste específico só será executável após a criação dos testes.
Antes do deploy: backup verificado, teste da migration em banco temporário,
candidate smoke, revisão e migração antes de recriar o app. A publicação deve
manter o canal pausado e sem pareamento até a próxima etapa com o usuário.

## Limites de execução

- Sempre: mudanças pequenas, testes antes do commit, entradas validadas, docs de
  banco/arquitetura/segurança/deploy atualizados e preservação dos dados atuais.
- Confirmar antes: novas tabelas e serviços desta proposta; qualquer dependência
  adicional, custo contratado ou expansão para comandos e dados do AVA.
- Nunca: modificar a instalação Miauby, compartilhar a sessão WhatsApp existente,
  expor segredos, testar com mensagens reais sem autorização específica ou
  afirmar pareamento/entrega sem observação.

## Riscos e decisões ainda abertas

- O transporte por Baileys é não oficial: funcionamento atual não elimina risco
  de bloqueio ou desconexão. A versão em uso no Miauby é apenas referência de
  compatibilidade, não comprovação de ausência de vulnerabilidades.
- Confirmar capacidade do Oracle antes de subir novos serviços. Se faltar
  capacidade, deixar configuração pronta e informar a limitação; não comprar
  infraestrutura nem reduzir recursos do Miauby silenciosamente.
- IA usa os provedores já configurados na Candy, sujeita às respectivas quotas e
  custos. Canal pausado não deve gerar consumo. Expor limites no painel.
- Número, contatos e comandos específicos serão escolhidos depois, sem importar
  automaticamente a base de alunos ou a agenda do telefone.
- Retenção de 24 horas/30 dias é proposta de minimização, não prazo legal afirmado.

Referências técnicas consultadas:

- [Baileys — escopo e aviso do projeto](https://github.com/WhiskeySockets/Baileys).
- [Evolution API — rotas da versão 2.3.0](https://github.com/evolution-foundation/evolution-api/blob/2.3.0/src/api/routes/instance.router.ts).
- [Evolution — configuração de webhooks](https://github.com/evolution-foundation/docs-evolution/blob/main/v2/en/configuration/webhooks.mdx).
- Referência local, somente leitura: `C:\Users\Williany\Desktop\wimifarma-com\apps\miauw-whatsapp`.

## Implementação e operação (12/09/2026)

Estado: código implementado e em validação; publicação e pareamento ainda não
comprovados nesta seção. Não interpretar existência do painel como canal ativo.
O usuário esclareceu que a base Miauby foi obtida de um repositório GitHub e
funcionou; a referência concreta verificada é o clone local e o transporte
Evolution existente, não um novo repositório presumido.

### Configuração

- `CATTY_WHATSAPP_ENABLED=false` é o padrão. `true` habilita infraestrutura,
  não despausa `CattyWhatsappChannel.paused`.
- Quatro segredos independentes: `CATTY_WHATSAPP_ENCRYPTION_KEY` (64 caracteres
  hexadecimais), `CATTY_WHATSAPP_WEBHOOK_SECRET`, `CATTY_WHATSAPP_WORKER_SECRET`
  e `CATTY_EVOLUTION_API_KEY` (mínimo 32 caracteres cada).
- `CATTY_EVOLUTION_DB_PASSWORD`: senha hexadecimal independente, para não
  introduzir caracteres reservados na URL interna do banco do transporte.
- Guardar segredos no `.env` protegido, nunca em commits, histórico de mensagens
  ou screenshots. Não trocar a chave de criptografia sem migração dos ciphertexts.
- Overlay `docker-compose.whatsapp.yml`; limites máximos adicionais configurados:
  worker 128 MiB, Evolution 768 MiB e banco 256 MiB. Nenhuma porta nova é publicada.
- Rede `catty-channel` liga app/worker/Evolution; banco Evolution fica apenas na
  rede interna `catty-database`. As redes e volumes Miauby não são referenciados.
- Evolution usa `evoapicloud/evolution-api:v2.3.0` fixada no digest
  `sha256:83d0833a44a08a4121c887c7d9472563a06084269739a70248058808c09c065a`,
  conferido na imagem existente. Logs Docker desse transporte são desabilitados
  porque a implementação upstream pode imprimir QR apesar do nível silencioso.
  Worker registra somente transições de saúde. Não exibir respostas brutas da API.

### Instalação / atualização

1. Validar testes, backup e restore; aplicar migration aditiva antes do app.
2. Provisionar segredos independentes sem mostrar valores. Configurar o ambiente
   habilitado somente para a infraestrutura. O banco continua pausado.
   No Linux, `node scripts/configure-catty-whatsapp.mjs --apply` cria somente
   chaves ausentes, preserva `.env` anterior com modo 600 e define `COMPOSE_FILE`
   para manter o overlay em futuros deploys. Recusa chaves inválidas/repetidas
   e configuração Compose prévia incompatível. Nunca executa pareamento/envio.
3. Usar sempre o overlay ao recriar o app quando o canal estiver instalado:

```bash
cd /home/ubuntu/projetos/candy-english
docker compose --profile tools run --rm migrate
docker compose -f docker-compose.yml -f docker-compose.whatsapp.yml config --quiet
docker compose -f docker-compose.yml -f docker-compose.whatsapp.yml up -d --no-deps app
docker compose -f docker-compose.yml -f docker-compose.whatsapp.yml up -d catty-evolution-db catty-evolution catty-worker
docker compose -f docker-compose.yml -f docker-compose.whatsapp.yml ps
```

4. Admin abre `/ava/whatsapp`, cadastra somente pessoas autorizadas e gera QR.
   Ler em WhatsApp → Aparelhos conectados. Não compartilhar QR ou sessão.
5. Consultar conexão; ativação exige estado `open` e heartbeat recente do worker.
   Somente então clicar `Ativar envios`. Não importar contatos automaticamente.
6. Validar a primeira conversa com destinatário de teste escolhido pelo usuário.
   Nenhum teste automatizado usa número real. Comandos novos continuam pendentes.

### Limites e recuperação

- Até 100 contatos; 100 mensagens aceitas/24h, 10 por contato/hora e 20 pendentes.
  Janela deslizante, limites checados sob lock; mensagens canceladas contam.
- Eventos recebidos com mais de 5 minutos ou de antes do consentimento são
  ignorados. A fila também expira em 5 minutos. `SAIR`, `PARAR`, `STOP` e frases
  previstas bloqueiam o contato sem IA, mesmo quando o canal está pausado.
- Pausar cancela QUEUED/PROCESSING. Envio já em transmissão pode terminar.
- `SENT` significa aceitação pelo transporte, não entrega/leitura confirmada.
  `UNCERTAIN` nunca é repetido automaticamente; conferir no celular primeiro.
- Worker adquire lease de 120s e processa uma mensagem por chamada, a cada 10s.
  Queda antes do envio permite retomar até 3 tentativas dentro do prazo; queda
  depois de iniciar envio vira `UNCERTAIN`. O botão não reenvia automaticamente.
- Histórico da UI contém status e autor, não texto das conversas. Consentimento
  e operação manual exigem confirmação. Autor manual precisa continuar ADMIN
  ativo na hora do envio; desativação/rebaixamento cancela a operação pendente.
- Conteúdo expira em 24h; registros/auditoria em 30 dias. Limpeza ocorre no worker
  inclusive pausado. Indisponibilidade pode atrasar a eliminação física, mas
  contexto expirado não volta à IA. Backups cifrados seguem a retenção própria
  atual de 14 dias; após restore, executar limpeza antes de reativar.
- O backup existente do banco Candy inclui as tabelas do canal. Sessão e banco
  Evolution separados não fazem parte desse backup; perda deles requer novo
  pareamento. Não copiar sessão do Miauby como forma de recuperação.

### Evidências parciais

- 16 testes unitários aprovados em 11/09; domínio, criptografia, limites de body,
  configuração, permissão e transporte com fetch fake.
- 14 verificações integradas aprovadas em schema temporário no PostgreSQL do
  Oracle: concorrência, deduplicação, pausa, opt-out, expiração, retenção, envio
  incerto, operação manual e lease. Schema removido no finally; zero mensagens
  reais. Admin desativado também é impedido de enviar operação manual pendente.
- 282 testes gerais, 9 testes de autenticação mobile, typecheck e lint aprovados
  em 12/09. Audit npm: zero críticas e 12 altas preexistentes; nenhuma dependência
  npm foi adicionada ou atualizada neste trabalho. Build/publicação ainda pendentes.
- Revisão independente encontrou 3 bugs, reproduzidos com testes: opt-out antigo
  após nova autorização, erro HTTP400 pós-envio e falha tardia de worker sem lease.
  Corrigidos antes da publicação. Revalidar resultados ao concluir a entrega.
