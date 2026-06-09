# 17 - Candy XP Atividades

## O que esta parte do sistema faz

O modulo Candy XP Atividades cria uma area gamificada de historias e missoes para alunos. O admin monta uma atividade com PDF/imagem exportado do Canva, liberacao, status, XP e areas interativas posicionadas sobre o arquivo. O aluno responde diretamente no PDF/imagem, com texto, letra/numero, marca ou desenho, e envia a missao quando concluir. Atividades novas nao exigem perguntas manuais separadas; perguntas continuam existindo apenas para compatibilidade com atividades antigas que ja foram criadas nesse formato.

Este modulo e o esqueleto jogavel da trilha Candy XP. Ele ainda nao e um minijogo em tempo real de vocabulario/listening; ele usa historias, PDF/imagem e progresso individual.

## Arquivos, rotas, componentes, tabelas ou servicos envolvidos

Rotas:

- `/ava/admin?task=candy-xp`
- `/ava/student?task=candy-xp`
- `/ava/candy-xp-assets/[activityId]`

Actions:

- `src/app/ava/candy-xp/actions.ts`

Componentes:

- `src/components/ava/admin-candy-xp-panel.tsx`
- `src/components/ava/interactive-homework-editor.tsx`
- `src/components/ava/interactive-homework-review.tsx`
- `src/components/ava/interactive-homework-student.tsx`
- `src/components/ava/student-candy-xp-activities-panel.tsx`
- `src/components/ava/admin-users-panel.tsx`
- `src/components/ava/student-workspace.tsx`

Helpers e validacoes:

- `src/lib/candy-xp-activities.ts`
- `src/lib/candy-xp-persistence.ts`
- `src/lib/file-optimization.ts`
- `src/lib/validations/candy-xp-activities.ts`
- `src/lib/storage.ts`

Banco:

- `CandyXpActivity`
- `CandyXpActivityInteractiveField`
- `CandyXpActivityQuestion`
- `CandyXpActivityAssignment`
- `CandyXpActivitySubmission`
- `CandyXpActivityStatus`
- `CandyXpQuestionType`
- `CandyXpSubmissionStatus`
- `HomeworkFieldType`
- `CandyXpEventKind.CANDY_XP_ACTIVITY_COMPLETED`

## Fluxo admin

1. Admin abre `/ava/admin?task=candy-xp`.
2. Admin cria uma atividade com titulo, descricao, nivel, categoria e XP; no formulario atual, o padrao e `Publicado` para `Todos os alunos`.
3. Admin envia PDF/imagem do Canva; se for PDF, o servidor tenta otimizar com Ghostscript antes de salvar.
4. O arquivo final fica em `storage/candy-xp-assets`.
5. Admin pode manter `Todos os alunos` para a atividade aparecer na aba Candy XP de todos os students, ou escolher um aluno especifico para liberar individualmente.
6. Admin abre o editor do PDF Candy XP dentro do card da atividade e desenha areas interativas sobre o arquivo para todos os alunos liberados.
7. Nesta fase, Candy XP aceita campos `TINY_TEXT`, `SHORT_TEXT`, `LONG_TEXT`, `CHECKBOX` e `DRAWING`; `LISTENING` continua restrito ao homework/aula interativa ate existir rota propria.
8. Admin pode editar a ficha da atividade e alternar entre rascunho, publicado e arquivado.
9. Admin pode excluir uma atividade criada por engano; a exclusao remove arquivo, liberacoes, perguntas, areas interativas e respostas operacionais da atividade, mas nao remove eventos historicos de XP ja conquistado.
10. Admin acompanha envios. Atividades novas com areas interativas concluem pelo envio preenchido e liberam XP automaticamente; atividades antigas com resposta escrita ainda podem aparecer para correcao manual.

## Fluxo aluno

1. Student abre `/ava/student?task=candy-xp`.
2. O aluno ve apenas atividades `PUBLISHED` liberadas para todos ou atribuidas ao seu perfil. Atividade publicada sem `CandyXpActivityAssignment` aparece para todos os alunos.
3. O aluno abre o PDF/imagem pela rota protegida.
4. Se houver areas interativas, o aluno responde diretamente sobre o arquivo com autosave de rascunho.
5. Se a atividade antiga tiver perguntas separadas, ele ainda pode responder e salvar progresso como `DRAFT`.
6. Ao enviar:
   - se a atividade tiver areas interativas obrigatorias vazias, o envio e bloqueado ate preencher;
   - se a atividade nao tiver perguntas manuais, vira `REVIEWED` e grava XP na hora;
   - se a atividade antiga tiver apenas questoes objetivas e todas estiverem certas, vira `REVIEWED` e grava XP na hora;
   - se tiver questao objetiva errada, vira `RETURNED` para refazer;
   - se tiver questao escrita, vira `SUBMITTED` e aguarda correcao manual.
7. Quando aprovado ou concluido automaticamente, o sistema grava `CandyXpEvent` com `sourceKey` unica por submissao.

## Regras de negocio que precisam ser preservadas

- Apenas `ADMIN` cria, edita, publica, arquiva, exclui e corrige atividades Candy XP.
- `STUDENT` so acessa atividades publicadas e liberadas para ele.
- `TEACHER` nao acessa arquivos Candy XP nesta fase.
- Arquivos sao servidos apenas pela rota protegida `/ava/candy-xp-assets/[activityId]`.
- XP e gravado no servidor, nunca no client.
- Cada conclusao usa `sourceKey = student:candy-xp-activity:{submissionId}` para evitar XP duplicado.
- `CandyXpActivitySubmission` e unica por atividade/aluno e guarda rascunho, envio, correcao, feedback e XP concedido.
- `CandyXpActivityInteractiveField` guarda tipo, pagina, posicao percentual e obrigatoriedade das areas desenhadas pelo admin.
- Respostas de areas Candy XP ficam em `CandyXpActivitySubmission.answers` usando o ID da area como `questionId` para reaproveitar o fluxo de envio existente.
- Atividades novas em PDF/imagem podem ser concluidas sem perguntas manuais separadas.
- Atividades novas com areas interativas obrigatorias so concluem quando essas areas estao preenchidas.
- Respostas objetivas de atividades antigas usam correcao automatica; respostas escritas exigem correcao manual.
- Atividades arquivadas nao aparecem para alunos.

## Decisoes tecnicas tomadas

- O modulo usa modelos proprios, em vez de reaproveitar `Homework`, porque a regra de XP, liberacao e correcao e diferente.
- O PDF/imagem fica em `storage/candy-xp-assets`, seguindo o padrao de uploads protegidos do AVA.
- A otimizacao de PDF usa `src/lib/file-optimization.ts`, compartilhado com homework/aulas interativas, e so substitui o arquivo quando a versao otimizada fica menor e nao parece perder paginas.
- Se Ghostscript nao estiver disponivel, falhar ou gerar arquivo maior, o upload continua salvando o original e retorna mensagem amigavel ao admin.
- A premiacao usa o ledger existente `CandyXpEvent` e atualiza `CandyXpProfile` por `recordCandyXpEventsForUser`.
- A tela student mostra cards gamificados com nivel, categoria, XP, progresso e status.
- A tela student reaproveita o componente de homework interativo para responder areas sobre o PDF/imagem quando a atividade tem campos Candy XP.
- A tela admin prioriza criacao rapida e acompanhamento, com cards mais destacados para cabecalho, editor do PDF, arquivo, liberacao e respostas. O bloco de perguntas saiu da criacao nova porque o PDF/imagem e a atividade principal; perguntas seguem como compatibilidade para atividades antigas.
- O editor de areas reaproveita `interactive-homework-editor`, mas usa `source=CANDY_XP`, rota `/ava/candy-xp-assets/{activityId}` e action propria de `ADMIN` para salvar campos.
- A exclusao administrativa usa server action com role `ADMIN`, apaga `CandyXpActivity` e seus dependentes por cascade, tenta remover o arquivo fisico em `storage/candy-xp-assets` e preserva `CandyXpEvent` como historico de conquista.

## Riscos ao alterar esta parte

- Liberar arquivo sem checar status/assignment pode vazar material privado.
- Usar preset agressivo de PDF pode deixar texto pequeno do Canva ilegivel; o padrao `ebook` e o caminho equilibrado.
- Alterar respostas corretas de atividades antigas depois de envios pode tornar historico inconsistente.
- Remover `sourceKey` estavel pode duplicar XP.
- Excluir uma atividade remove respostas e progresso operacional; a UI deve manter confirmacao antes da server action.
- Permitir `LISTENING` no Candy XP antes de criar rotas proprias pode quebrar OCR/audio, porque hoje esses recursos ainda sao especificos do homework.
- Transformar `TEACHER` em corretora deste modulo exige nova regra de permissao por vinculo.
- Recalcular XP apagando eventos antigos quebraria o historico de conquistas.

## Pendencias

- Liberacao em lote para multiplos alunos especificos ainda nao existe; hoje e todos ou um aluno.
- Exportacao da resposta final em PDF ainda nao existe.
- `LISTENING` interativo para Candy XP ainda nao existe.
- Minijogos executaveis de vocabulario/listening/speaking ainda precisam de fase propria.

## Como pode evoluir

- Criar temporadas Candy XP sem ranking publico sensivel.
- Permitir duplicar atividade para reaproveitar estrutura.
- Adicionar biblioteca de categorias/niveis.
- Criar relatorio admin por aluno, categoria e nivel.
- Adicionar teacher como revisora somente com regra clara de vinculo.
