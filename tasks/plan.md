# Plano — Catty WhatsApp

Escopo aprovado: `docs/24-catty-whatsapp.md`. Integração isolada e pausada,
sem alterações no Miauby ou comandos administrativos pelo WhatsApp.

1. Domínio seguro: testes primeiro para extração, identidade, expiração,
   autenticação, criptografia e transporte Evolution. Sem acesso ao banco.
2. Persistência: migration aditiva, contatos autorizados, estado pausado,
   fila deduplicada e auditoria. Verificar schema e concorrência com fixtures.
3. Fluxo operacional: webhook autenticado, worker, resposta Catty sem dados AVA,
   envio individual confirmado e estados de entrega incerta. Mock do transporte.
4. Painel ADMIN: conexão QR, pausa, contatos, envio e histórico de status.
   Reutilizar shell e componentes Candy; verificar bloqueio de outras roles.
5. Infraestrutura: Compose exclusivo para transporte e worker, limites de
   recursos, segredos fora do Git, documentação de operação e retenção.
6. Entrega: testes, typecheck, lint, build, revisão, backup/migration candidate,
   commit/push e publicação pausada se os gates e recursos do Oracle permitirem.

Checkpoints após 1, 3 e 6. Não avançar com falhas de segurança. Não executar
envio real, importar contatos, parear número ou contratar infraestrutura.
Rollback do app preserva tabelas aditivas; nunca excluir dados para desfazer UI.
