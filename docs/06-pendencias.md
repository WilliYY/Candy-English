# 06 - Pendencias

## O que esta parte do sistema faz

Este documento registra o que ainda nao existe, o que esta incompleto e os cuidados conhecidos. Ele evita que futuras conversas confundam desejo futuro com funcionalidade implementada.

## Arquivos, rotas, componentes, tabelas ou servicos envolvidos

As pendencias podem afetar:

- `src/app/ava/admin`
- `src/app/ava/teacher`
- `src/app/ava/student`
- `src/components/ava/`
- `prisma/schema.prisma`
- `docker-compose.yml`
- `docs/`

## Pendencias de produto

- Edicao completa de usuarios existentes.
- Edicao/delecao completa de aulas e materiais; aula/homework interativa ja podem ser excluidas nas telas de criacao.
- Multiplas perguntas por homework na interface.
- Exportacao de homework interativo preenchido como PDF final.
- Upload livre de materiais de aula fora dos fluxos interativos.
- Editor ou visualizador Word embutido.
- Notificacoes por email ou WhatsApp.
- Relatorios avancados e dashboard complexo.
- Base de conhecimento propria/RAG para Catty responder sobre conteudos internos da Candy sem depender apenas da conversa digitada.
- Jogos.
- Pagamento online ou integracao externa de cobranca.
- Exportacao/importacao em massa da agenda.
- Jitsi dedicado ou JaaS para aula ao vivo sem conta externa e sem limite de embed do `meet.jit.si` publico.

## Pendencias tecnicas

- Rotina formal de backup e restore do PostgreSQL.
- Revogacao imediata de sessoes JWT apos mudanca de role, desativacao ou redefinicao de senha.
- Throttling mais forte por IP ou servico dedicado, inclusive para a Catty com OpenAI.
- Normalizacao case-insensitive mais robusta para email.
- Testes automatizados amplos por modulo.
- Auditoria administrativa geral fora do financeiro.
- Auditoria da agenda ainda e log simples, nao relatorio completo.
- OCR/IA do homework interativo esta fora do fluxo padrao manual; reativar sugestao automatica exige decisao explicita e revisao de custo/privacidade.
- Observabilidade externa e alertas de producao.
- DNS/infra do dominio de aula ao vivo dedicado, por exemplo `meet.candyenglish.com.br`, ainda precisa ser configurado antes de trocar `NEXT_PUBLIC_LIVE_CLASS_JITSI_DOMAIN` em producao.

## Pendencias de documentacao

- Criar docs especificos se os temas crescerem:
  - `docs/11-seguranca.md`
  - `docs/14-painel-administrativo.md`
  - `docs/15-logs-e-auditoria.md`
  - `docs/16-testes.md`
  - `docs/17-performance.md`
  - `docs/18-modulos-futuros.md`
- Manter documentos historicos alinhados com a serie oficial numerada.

## Regras de negocio que precisam ser preservadas

- Nao implementar novas IAs alem da Catty/OpenAI e OCR opcional documentados, jogos, pagamentos online, MinIO ou integracoes externas sem pedido explicito.
- Nao enviar arquivos de homework para servicos externos sem configuracao explicita de chave/API.
- Nao transformar financeiro interno em gateway de pagamento sem decisao nova.
- Nao abrir dados globais de alunos para teacher sem permissao por vinculo.
- Nao expor arquivos privados sem rota protegida.

## Decisoes tecnicas ja tomadas

- O projeto prioriza MVP operacional e seguro em vez de dashboard grande.
- Materiais podem usar links externos; upload livre fica para fase futura.
- Aula ao vivo usa Jitsi por enquanto.
- Catty usa OpenAI quando `OPENAI_API_KEY` esta configurada e fallback local quando nao esta; ainda nao possui base de conhecimento propria nem historico persistente.

## Riscos ao alterar esta parte

- Implementar pendencias grandes sem decompor pode gerar regressao no AVA.
- Confundir pendencia com funcionalidade existente pode criar documentacao falsa.
- Adicionar integracao externa sem plano de seguranca pode expor dados ou custos; a Catty deve continuar limitada ao texto digitado no widget.

## Como pode evoluir

- Transformar cada pendencia maior em fase propria.
- Criar criterios de aceite antes de implementar recursos grandes.
- Adicionar testes de permissao antes de expandir areas sensiveis.
