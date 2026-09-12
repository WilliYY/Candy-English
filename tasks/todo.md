# Catty WhatsApp — execução

- [ ] 1. Validação e criptografia (`domain.ts`, `crypto.ts`, testes).
  Aceite: rejeita origem imprópria e dados inválidos; ciphertext autenticado.
  Verificar: testes focados com `npx tsx --test`.
- [ ] 2. Transporte Evolution (`transport.ts`, testes).
  Aceite: URLs fixas, timeout, resposta validada, erro sem segredos; QR só admin.
  Verificar: fetch fake, sem mensagem real. Depende de 1.
- [ ] 3. Persistência (`schema.prisma`, migration, docs banco).
  Aceite: migration aditiva, default pausado, deduplicação e índices.
  Verificar: Prisma validate/generate e migration temporária. Depende de 1.
- [ ] 4. Recepção e processamento (`service.ts`, webhook, worker, reply).
  Aceite: fila limitada, pause/opt-out revalidados, entrega incerta sem retry.
  Verificar: testes de concorrência e transporte fake. Depende de 2/3.
- [ ] 5. Administração (`actions.ts`, página, painel, navegação).
  Aceite: conta ADMIN atual, QR temporário, formulários acessíveis e feedback.
  Verificar: permissões, typecheck e inspeção responsiva. Depende de 4.
- [ ] 6. Operação (`ops/`, worker, env example, docs).
  Aceite: serviços isolados, recursos limitados, nenhuma porta de banco pública.
  Verificar: Compose config e smoke sem pareamento. Depende de 4.
- [ ] 7. Revisão e entrega.
  Aceite: testes existentes preservados e produção saudável, canal pausado.
  Verificar: test suites, lint, build, audit, candidate e published smoke.
  Depende de 5/6. Registrar qualquer gate pendente sem declarar conclusão.
