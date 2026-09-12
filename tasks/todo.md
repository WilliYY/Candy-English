# Catty WhatsApp — execução

## Liberação por pessoa — rascunho pendente de aprovação

- [x] Conferir código, schema, identidade informada e estado do canal.
  Grupo Interno único, 5 participantes; canal pausado; nenhum novo envio.
- [ ] Aprovação da especificação e migration aditiva pelo responsável.
- [ ] A. Políticas de telefone e role, testes primeiro (3–4 arquivos).
  Aceite: sem vínculo/telefone válido não libera; alunos não acionam IA;
  `SAIR` permanece permitido. Verificar testes focados. Depende da aprovação.
- [ ] B. Schema/migration e documentação do banco (até 4 arquivos).
  Aceite: defaults bloqueados, unicidade e histórico preservado.
  Verificar Prisma e migration em schema isolado. Depende de A.
- [ ] C. Mutação ADMIN auditada com identidade exata (até 4 arquivos).
  Aceite: preferências separadas; duplicidade/troca de telefone invalida fila;
  nenhuma alteração de role. Verificar testes e smoke isolado. Depende de B.
- [ ] D. Guardas na entrada/worker (até 4 arquivos).
  Aceite: conta inativa, excluída ou permissão revogada bloqueiam envio;
  grupos seguem ignorados. Verificar corridas com transporte falso. Depende de C.
- [ ] E. Boas-vindas duradouras e personalidade (até 4 arquivos).
  Aceite: cobre primeiro envio manual e automático, não repete após 24h ou
  reinício; entrega incerta sem retry. Verificar testes falsos. Depende de D.
- [ ] F. Tela de liberação por pessoa (até 4 arquivos).
  Aceite: nome/role/telefone legíveis; preferências sem automação implícita;
  erro sem telefone válido. Verificar typecheck e visual desktop/mobile.
  Depende de C/D.
- [ ] G. Destino Interno preparado, sem ativação (até 4 arquivos).
  Aceite: ADMIN seleciona ID verificado; JID protegido; nenhum disparo ou
  leitura de conversa. Verificar transporte falso e permissões. Depende de B/F.
- [ ] H. Revisão, docs e publicação pausada.
  Aceite: suítes, lint/build e smokes passam; backup/migration verificados;
  commit/push e saúde publicados com evidência. Depende de E/F/G.

## Histórico — primeira versão

- [x] 1. Validação e criptografia (`domain.ts`, `crypto.ts`, testes).
  Aceite: rejeita origem imprópria e dados inválidos; ciphertext autenticado.
  Verificar: testes focados com `npx tsx --test`.
- [x] 2. Transporte Evolution (`transport.ts`, testes).
  Aceite: URLs fixas, timeout, resposta validada, erro sem segredos; QR só admin.
  Verificar: fetch fake, sem mensagem real. Depende de 1.
- [x] 3. Persistência (`schema.prisma`, migration, docs banco).
  Aceite: migration aditiva, default pausado, deduplicação e índices.
  Verificar: Prisma validate/generate e migration temporária. Depende de 1.
- [x] 4. Recepção e processamento (`store.ts`, webhook, worker, reply).
  Aceite: fila limitada, pause/opt-out revalidados, entrega incerta sem retry.
  Verificar: testes de concorrência e transporte fake. Depende de 2/3.
- [x] 5. Administração (`actions.ts`, página, painel, navegação).
  Aceite: conta ADMIN atual, QR temporário, formulários acessíveis e feedback.
  Permissões HTTP/typecheck aprovados; conferência visual autenticada pendente.
  Depende de 4.
- [x] 6. Operação (Compose, worker, env example, docs).
  Aceite: serviços isolados, recursos limitados, nenhuma porta de banco pública.
  Verificar: Compose config e smoke sem pareamento. Depende de 4.
- [x] 7. Revisão e entrega.
  Aceite: testes existentes preservados e produção saudável, canal pausado.
  Verificar: test suites, lint, build, audit, candidate e published smoke.
  Depende de 5/6. Registrar qualquer gate pendente sem declarar conclusão.

- [x] Pareamento e primeiro teste consentido concluídos em etapa anterior;
  recebimento confirmado pelo responsável. Canal continua pausado.
- [ ] Conferência visual autenticada da interface publicada. Evidências e
  correções da primeira versão: `docs/24-catty-whatsapp.md`.
