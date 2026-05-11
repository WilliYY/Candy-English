# Roadmap

Este documento foi mantido por compatibilidade com referencias antigas. A lista oficial de pendencias e evolucoes fica em:

- `docs/06-pendencias.md`

## O que esta parte do sistema faz

Aponta os proximos temas possiveis sem tratar ideias futuras como funcionalidades existentes.

## Arquivos, rotas, componentes, tabelas ou servicos envolvidos

Pode envolver todo o projeto, especialmente:

- `src/app/ava/`
- `src/components/ava/`
- `prisma/schema.prisma`
- `docs/`

## Regras de negocio que precisam ser preservadas

- Nao criar IA, jogos, pagamento online, MinIO ou integracoes externas sem pedido explicito.
- Toda evolucao deve manter roles e permissoes por dado.
- Toda mudanca estrutural deve atualizar docs.

## Decisoes tecnicas ja tomadas

- O projeto prioriza AVA operacional e seguro.
- Funcionalidades grandes devem virar fases pequenas e rastreaveis.

## Riscos ao alterar esta parte

- Confundir roadmap com escopo implementado pode induzir futuras conversas ao erro.
- Implementar muitos modulos juntos aumenta risco de regressao.

## Pendencias

Veja `docs/06-pendencias.md`.

## Como pode evoluir

Criar milestones por fase quando houver planejamento formal de produto.
