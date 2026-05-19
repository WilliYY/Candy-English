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

- Reset de senha pela interface admin.
- Edicao completa de usuarios existentes.
- Edicao/delecao completa de aulas e materiais; homework interativa ja pode ser excluida na tela de criacao.
- Multiplas perguntas por homework na interface.
- Reposicionamento por arrastar nos campos do homework interativo.
- Exportacao de homework interativo preenchido como PDF final.
- Upload livre de materiais de aula.
- Editor ou visualizador Word embutido.
- Notificacoes por email ou WhatsApp.
- Relatorios avancados e dashboard complexo.
- IA conversacional real conectada ao Catty.
- Jogos.
- Pagamento online ou integracao externa de cobranca.
- Exportacao/importacao em massa da agenda.

## Pendencias tecnicas

- Rotina formal de backup e restore do PostgreSQL.
- Revogacao imediata de sessoes JWT apos mudanca de role ou desativacao.
- Throttling mais forte por IP ou servico dedicado.
- Normalizacao case-insensitive mais robusta para email.
- Testes automatizados amplos por modulo.
- Auditoria administrativa geral fora do financeiro.
- Auditoria da agenda ainda e log simples, nao relatorio completo.
- OCR/IA do homework interativo depende de `OPENAI_API_KEY`; sem chave, apenas fallback manual.
- Observabilidade externa e alertas de producao.

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

- Nao implementar IA, jogos, pagamentos online, MinIO ou integracoes externas sem pedido explicito.
- Nao enviar arquivos de homework para servicos externos sem configuracao explicita de chave/API.
- Nao transformar financeiro interno em gateway de pagamento sem decisao nova.
- Nao abrir dados globais de alunos para teacher sem permissao por vinculo.
- Nao expor arquivos privados sem rota protegida.

## Decisoes tecnicas ja tomadas

- O projeto prioriza MVP operacional e seguro em vez de dashboard grande.
- Materiais podem usar links externos; upload livre fica para fase futura.
- Aula ao vivo usa Jitsi por enquanto.
- Catty e visual/interface; IA real nao esta implementada.

## Riscos ao alterar esta parte

- Implementar pendencias grandes sem decompor pode gerar regressao no AVA.
- Confundir pendencia com funcionalidade existente pode criar documentacao falsa.
- Adicionar integracao externa sem plano de seguranca pode expor dados ou custos.

## Como pode evoluir

- Transformar cada pendencia maior em fase propria.
- Criar criterios de aceite antes de implementar recursos grandes.
- Adicionar testes de permissao antes de expandir areas sensiveis.
