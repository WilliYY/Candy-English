# Plano — Catty WhatsApp

## Próxima etapa proposta — aguardando aprovação

Especificação: seção “Proposta: liberação por pessoa, boas-vindas e grupo
Interno” em `docs/24-catty-whatsapp.md`. Este plano é rascunho para revisão,
não autorização para migrar banco, disparar avisos ou despausar o canal.

1. Persistência aditiva e políticas puras: vínculo com `User`, preferências,
   estado duradouro de boas-vindas e destino de grupo inicialmente desabilitado.
2. Autorização ponta a ponta: ADMIN configura; ADMIN/TEACHER ativos conversam;
   STUDENT somente recebe avisos autorizados. Revalidar durante toda a fila.
3. Boas-vindas: reserva transacional antes do transporte; apresentação por
   número independentemente da expiração do histórico. Sem retry incerto.
4. UI: seletor de conta do AVA com telefone/role e opções independentes;
   bloqueio explicado quando faltar telefone. Grupo preparado, sem disparo.
5. Personalidade: reutilizar repertório Candy com tom WhatsApp; evitar
   promessas de consulta/ação ainda inexistentes. Manter GPT-5.4 e limites.
6. Verificação, documentação e entrega pausada: testes falsos/isolados,
   revisão das permissões, visual responsivo, build, backup, migration e smokes.

Checkpoint após 1: aprovação/migration não destrutiva e testes de políticas.
Após 3: concorrência, opt-out e bloqueios passam com transporte falso.
Após 6: evidência de UI, app saudável e nenhum envio real novo.

Riscos: vincular pessoa errada (estado esperado/identidade exata), permissão
revogada durante fila (revalidação), welcome duplicado (marcador duradouro),
exposição em grupo (destino inativo/sem dados financeiros), opção na UI parecer
automação pronta (rotular preferências preparadas), rollback reabrir permissões
antigas (manter canal pausado até nova verificação).

Fora desta etapa: agenda de disparos, cobrança automática, leitura/escrita
financeira pela IA, conversa de alunos/grupos, quota pedagógica e novos modelos.
As integrações Financeiro/Agenda continuam como próximo escopo explícito.

## Histórico — plano da primeira versão

Escopo inicial aprovado: primeira versão de `docs/24-catty-whatsapp.md`. Integração isolada e pausada,
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
