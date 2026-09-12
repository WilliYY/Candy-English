# Catty WhatsApp — execução

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

- [ ] Próxima etapa do responsável: login ADMIN, conferência visual, pareamento
  do número escolhido e teste consentido. Canal continua pausado; nenhum envio
  real foi feito. Evidências e correções: `docs/24-catty-whatsapp.md`.
