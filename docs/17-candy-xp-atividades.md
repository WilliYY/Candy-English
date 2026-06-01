# 17 - Candy XP Atividades

## O que esta parte do sistema faz

O modulo Candy XP Atividades cria uma area gamificada de historias e missoes para alunos. O admin monta uma atividade com PDF/imagem exportado do Canva, perguntas e XP. O aluno abre a historia, responde, salva progresso e envia. Quando a atividade e objetiva e todas as respostas estao corretas, o XP e liberado automaticamente; quando ha resposta escrita, o envio fica pendente para correcao manual do admin.

Este modulo e o esqueleto jogavel da trilha Candy XP. Ele ainda nao e um minijogo em tempo real de vocabulario/listening; ele usa historias, perguntas e progresso individual.

## Arquivos, rotas, componentes, tabelas ou servicos envolvidos

Rotas:

- `/ava/admin?task=candy-xp`
- `/ava/student?task=candy-xp`
- `/ava/candy-xp-assets/[activityId]`

Actions:

- `src/app/ava/candy-xp/actions.ts`

Componentes:

- `src/components/ava/admin-candy-xp-panel.tsx`
- `src/components/ava/student-candy-xp-activities-panel.tsx`
- `src/components/ava/admin-users-panel.tsx`
- `src/components/ava/student-workspace.tsx`

Helpers e validacoes:

- `src/lib/candy-xp-activities.ts`
- `src/lib/candy-xp-persistence.ts`
- `src/lib/validations/candy-xp-activities.ts`
- `src/lib/storage.ts`

Banco:

- `CandyXpActivity`
- `CandyXpActivityQuestion`
- `CandyXpActivityAssignment`
- `CandyXpActivitySubmission`
- `CandyXpActivityStatus`
- `CandyXpQuestionType`
- `CandyXpSubmissionStatus`
- `CandyXpEventKind.CANDY_XP_ACTIVITY_COMPLETED`

## Fluxo admin

1. Admin abre `/ava/admin?task=candy-xp`.
2. Admin cria uma atividade com titulo, descricao, nivel, categoria, XP e status inicial.
3. Admin envia PDF/imagem do Canva; o arquivo fica em `storage/candy-xp-assets`.
4. Admin escolhe liberar para todos os alunos ou para um aluno especifico.
5. Admin cadastra perguntas:
   - resposta curta;
   - resposta longa;
   - multipla escolha;
   - checkbox;
   - matching.
6. Para multipla escolha e checkbox, o admin marca respostas corretas colocando `*` no inicio da alternativa.
7. Para matching, o admin usa uma linha por par no formato `left = right`.
8. Admin pode editar a ficha da atividade e alternar entre rascunho, publicado e arquivado.
9. Admin acompanha envios e corrige respostas escritas, aprovando com XP ou devolvendo para refazer.

## Fluxo aluno

1. Student abre `/ava/student?task=candy-xp`.
2. O aluno ve apenas atividades `PUBLISHED` liberadas para todos ou atribuidas ao seu perfil.
3. O aluno abre o PDF/imagem pela rota protegida.
4. O aluno responde as perguntas e pode salvar progresso como `DRAFT`.
5. Ao enviar:
   - se a atividade tiver apenas questoes objetivas e todas estiverem certas, vira `REVIEWED` e grava XP na hora;
   - se tiver questao objetiva errada, vira `RETURNED` para refazer;
   - se tiver questao escrita, vira `SUBMITTED` e aguarda correcao manual.
6. Quando aprovado, o sistema grava `CandyXpEvent` com `sourceKey` unica por submissao.

## Regras de negocio que precisam ser preservadas

- Apenas `ADMIN` cria, edita, publica, arquiva e corrige atividades Candy XP.
- `STUDENT` so acessa atividades publicadas e liberadas para ele.
- `TEACHER` nao acessa arquivos Candy XP nesta fase.
- Arquivos sao servidos apenas pela rota protegida `/ava/candy-xp-assets/[activityId]`.
- XP e gravado no servidor, nunca no client.
- Cada conclusao usa `sourceKey = student:candy-xp-activity:{submissionId}` para evitar XP duplicado.
- `CandyXpActivitySubmission` e unica por atividade/aluno e guarda rascunho, envio, correcao, feedback e XP concedido.
- Respostas objetivas usam correcao automatica; respostas escritas exigem correcao manual.
- Atividades arquivadas nao aparecem para alunos.

## Decisoes tecnicas tomadas

- O modulo usa modelos proprios, em vez de reaproveitar `Homework`, porque a regra de XP, liberacao e correcao e diferente.
- O PDF/imagem fica em `storage/candy-xp-assets`, seguindo o padrao de uploads protegidos do AVA.
- A premiacao usa o ledger existente `CandyXpEvent` e atualiza `CandyXpProfile` por `recordCandyXpEventsForUser`.
- A tela student mostra cards gamificados com nivel, categoria, XP, progresso e status.
- A tela admin prioriza criacao rapida e acompanhamento; edicao completa de perguntas apos envios deve ser tratada com cuidado em fase futura.

## Riscos ao alterar esta parte

- Liberar arquivo sem checar status/assignment pode vazar material privado.
- Alterar respostas corretas depois de envios pode tornar historico inconsistente.
- Remover `sourceKey` estavel pode duplicar XP.
- Transformar `TEACHER` em corretora deste modulo exige nova regra de permissao por vinculo.
- Recalcular XP apagando eventos antigos quebraria o historico de conquistas.

## Pendencias

- Edicao completa de perguntas depois da criacao ainda nao existe.
- Liberacao em lote para multiplos alunos especificos ainda nao existe; hoje e todos ou um aluno.
- Exportacao da resposta final em PDF ainda nao existe.
- Minijogos executaveis de vocabulario/listening/speaking ainda precisam de fase propria.

## Como pode evoluir

- Criar temporadas Candy XP sem ranking publico sensivel.
- Permitir duplicar atividade para reaproveitar estrutura.
- Adicionar biblioteca de categorias/niveis.
- Criar relatorio admin por aluno, categoria e nivel.
- Adicionar teacher como revisora somente com regra clara de vinculo.
