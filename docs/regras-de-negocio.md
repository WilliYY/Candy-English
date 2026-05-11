# Regras de Negocio

Este documento foi mantido por compatibilidade com referencias antigas. As regras oficiais estao distribuidas nos documentos numerados, especialmente:

- `docs/00-visao-geral.md`
- `docs/03-fluxos-do-sistema.md`
- `docs/08-autenticacao-e-permissoes.md`
- `docs/13-financeiro.md`

## O que esta parte do sistema faz

Registra as regras que nao podem ser quebradas ao evoluir o AVA.

## Arquivos, rotas, componentes, tabelas ou servicos envolvidos

- `src/app/ava/`
- `src/components/ava/`
- `src/lib/auth.ts`
- `src/lib/authorization.ts`
- `src/lib/validations/`
- `prisma/schema.prisma`

## Regras de negocio que precisam ser preservadas

- `ADMIN`, `TEACHER` e `STUDENT` sao as roles atuais.
- Admin pode supervisionar, mas actions ainda precisam validar permissao.
- Teacher so trabalha com alunos vinculados.
- Student so acessa dados proprios.
- Contratos e avatar usam rotas protegidas.
- Modo manutencao bloqueia student.
- Financeiro e interno do admin.
- Meses anteriores do financeiro sao historico fechado; edicao pode valer do mes selecionado em diante, mas remocao vale apenas no mes atual.
- Agenda e interna do admin e controla presenca/reposicao de 2026.

## Decisoes tecnicas ja tomadas

- Validacao sensivel fica no servidor.
- AVA usa `?task=` para tarefa principal por area.
- Jitsi e o provedor atual de aula ao vivo embutida.

## Riscos ao alterar esta parte

- Quebrar uma regra de permissao pode vazar dados pessoais ou escolares.
- Criar regra apenas na UI nao protege o servidor.

## Pendencias

Veja `docs/06-pendencias.md`.

## Como pode evoluir

Quando as regras crescerem, criar `docs/12-regras-de-negocio.md` com regras por modulo.
