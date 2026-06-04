# 15 - Homework Interativo

## O que esta parte do sistema faz

O homework interativo permite que a teacher envie um PDF ou imagem exportado do Canva, desenhe areas editaveis diretamente sobre o arquivo e deixe o aluno responder online dentro do AVA. A criacao de aula interativa reutiliza o mesmo motor por enquanto: cria uma `Lesson` real e uma atividade interativa vinculada a ela. O aluno escreve, marca ou desenha por cima do arquivo original, o rascunho e salvo automaticamente e a entrega vira evento novo para teacher/admin corrigirem.

O fluxo interativo e o modo de criacao usado na interface atual. O homework simples de pergunta/resposta fica apenas como legado para atividades antigas ja existentes.

## Arquivos, rotas, componentes, tabelas ou servicos envolvidos

Arquivos principais:

- `src/app/ava/teacher/actions.ts`
- `src/app/ava/student/actions.ts`
- `src/app/ava/teacher/page.tsx`
- `src/app/ava/student/page.tsx`
- `src/app/ava/homework-assets/[homeworkId]/route.ts`
- `src/components/ava/teacher-forms.tsx`
- `src/components/ava/homework-correction-tabs.tsx`
- `src/components/ava/teacher-workspace.tsx`
- `src/components/ava/student-workspace.tsx`
- `src/components/ava/interactive-homework-document.tsx`
- `src/components/ava/interactive-homework-editor.tsx`
- `src/components/ava/interactive-homework-review.tsx`
- `src/components/ava/interactive-homework-student.tsx`
- `src/lib/file-optimization.ts`
- `src/lib/homework-ocr.ts`
- `src/lib/storage.ts`
- `src/lib/validations/learning.ts`
- `next.config.ts`
- `prisma/schema.prisma`
- `prisma/migrations/20260512120000_interactive_homework/migration.sql`
- `prisma/migrations/20260519033000_interactive_homework_drawing_field/migration.sql`

Rotas:

- `/ava/teacher?task=criar-homework`
- `/ava/teacher?task=criar-aula`
- `/ava/teacher?task=corrigir-respostas`
- `/ava/student?task=aulas`
- `/ava/student?task=homeworks`
- `/ava/homework-assets/[homeworkId]`

Tabelas e enums:

- `Homework`
- `HomeworkInteractiveField`
- `HomeworkSubmission`
- `HomeworkKind`
- `HomeworkFieldType`
- `SubmissionStatus`

## Regras de negocio que precisam ser preservadas

- Apenas `ADMIN` ou `TEACHER` vinculada ao aluno pode criar e ajustar homework interativo.
- A aba `Criar aula` usa a mesma base tecnica do homework interativo, mas marca a atividade como `fieldDetectionSource=lesson-manual` para separar a lista de aulas interativas da lista de homeworks interativas.
- Para o aluno, `fieldDetectionSource=lesson-manual` aparece dentro de `Aulas e Materiais`; a aba `Responder homework` mostra apenas homeworks reais.
- Em `Aulas e Materiais`, cada aula deve aparecer recolhida por padrao, em estilo de lista operacional; ao abrir, a atividade interativa aparece como um card maior e centralizado, com estado `Concluido`/`Nao concluido` marcado por bolinha verde/vermelha.
- A criacao de homework seleciona teacher e aluno; o sistema cria uma aula interna automaticamente para manter o vinculo de permissao do homework.
- Na criacao de aula interativa, o sistema cria uma aula real com titulo/resumo/data e vincula uma atividade `Homework.kind=INTERACTIVE` a ela.
- Homework interativo precisa continuar ligado a uma aula com aluno definido, mesmo quando essa aula for criada automaticamente.
- O arquivo fica em `storage/homework-assets` ou no volume Docker equivalente, nunca no Git.
- Imagens continuam limitadas a 14 MB; PDFs usam `PDF_MAX_UPLOAD_MB` com padrao de 14 MB, mantendo `next.config.ts` em 15 MB para a Server Action receber o arquivo com folga.
- PDFs passam por tentativa de otimizacao server-side antes de salvar; se falhar, nao reduzir tamanho ou parecer perder paginas, o original e salvo.
- O acesso ao arquivo passa por rota protegida; student so abre arquivo da propria homework.
- Campos usam coordenadas percentuais (`page`, `x`, `y`, `width`, `height`) relativas a pagina real do PDF/imagem para se adaptar ao tamanho da tela.
- O PDF/imagem original deve permanecer visivel como fundo; areas editaveis sao overlays transparentes e nao devem redesenhar, cobrir ou substituir o arquivo.
- Na tela do aluno, as areas de escrita, checkbox e desenho nao devem mostrar borda, fundo, placeholder ou caixa HTML propria; apenas a resposta digitada, a marca selecionada ou os tracos desenhados devem aparecer.
- A criacao nova nasce sem campos automaticos; a teacher escolhe o tipo de area e desenha no tamanho desejado diretamente sobre a pagina.
- No editor da teacher, cada area manual deve exibir uma previa discreta do resultado final (`x` centralizado, texto exemplo alinhado como a resposta do aluno ou area de desenho) para deixar claro onde a resposta aparecera.
- O editor deve permitir mover, redimensionar, excluir a area selecionada e limpar todas as areas antes de salvar.
- Campos podem ser `SHORT_TEXT`, `LONG_TEXT`, `CHECKBOX` ou `DRAWING`; `DRAWING` salva tracos vetoriais normalizados dentro do JSON de respostas e deve permitir desfazer o ultimo traco sem apagar todo o desenho.
- `ADMIN` ou a `TEACHER` dona da homework pode excluir uma homework interativa pela lista de criacao.
- Excluir homework interativa remove campos, perguntas e respostas por cascade; tambem remove a aula interna automatica quando ela ficou vazia.
- `DRAFT` e apenas rascunho/autosave e nao entra na fila de correcao.
- `SUBMITTED` e entrega oficial e gera evento para teacher/admin.
- `RETURNED` libera o aluno para refazer.
- `REVIEWED` bloqueia nova entrega e preserva feedback.
- A tela de correcao separa entregas `SUBMITTED` em `Aguardando correcao` e entregas `REVIEWED`/`RETURNED` em `Corrigidos`; cada entrega fica recolhida por padrao para reduzir poluicao visual.
- Na correcao de homework interativo, o PDF/imagem com as respostas do aluno deve aparecer aberto como superficie principal, com texto, marcas e desenhos sobrepostos ao arquivo original.
- O painel lateral da correcao mostra aluno, professor responsavel, aula e o campo de nota/feedback que aparece para o aluno.
- OCR/IA e opcional/futuro; o fluxo padrao atual e manual e nao deve enviar o arquivo para servicos externos sem decisao explicita.

## Decisoes tecnicas tomadas

- O modo do homework fica em `Homework.kind`, com `TEXT` como padrao para preservar o comportamento antigo.
- A interface de criacao nova removeu o formulario `TEXT`; esse modo permanece no banco apenas para compatibilidade com registros antigos.
- Metadados do arquivo ficam no proprio `Homework` para evitar tabela extra nesta fase.
- Campos interativos ficam em `HomeworkInteractiveField`, com cascade quando a homework for apagada futuramente.
- A exclusao de homework interativa usa server action com validacao de role/dono e tenta remover o arquivo fisico de `storage/homework-assets` apos apagar os registros.
- A rota `/ava/homework-assets/[homeworkId]` reutiliza o padrao de contratos protegidos.
- A visualizacao usa `pdfjs-dist` no client para renderizar PDFs pagina a pagina em canvas, mantendo proporcao real do arquivo antes de aplicar overlays HTML/SVG.
- A revisao do arquivo entregue reutiliza a mesma renderizacao fiel e mostra os valores da submissao sobre os campos percentuais salvos.
- A criacao interativa grava `fieldDetectionSource` como `manual` e nao cria `HomeworkInteractiveField` automaticamente.
- A criacao de aula interativa grava `fieldDetectionSource` como `lesson-manual` e tambem nasce sem `HomeworkInteractiveField`.
- A otimizacao de PDF reaproveita `src/lib/file-optimization.ts`, o mesmo helper do Candy XP, e retorna mensagem de tamanho original/final para a teacher quando houver tentativa.
- O editor manual cria `HomeworkInteractiveField` somente quando a teacher desenha e salva as areas sobre o arquivo.
- Campos `CHECKBOX` usam criacao/redimensionamento em quadrado visual e podem ser menores que campos de texto para alinhar a marca exatamente dentro de parenteses ou caixinhas ja existentes no PDF.
- O helper de OCR/OpenAI permanece isolado em `src/lib/homework-ocr.ts`, mas nao faz parte do fluxo padrao atual.
- Imagens usam a dimensao natural como pagina unica; PDFs podem renderizar multiplas paginas e campos podem ser direcionados por numero de pagina.

## Riscos ao alterar esta parte

- Expor arquivo direto por URL publica quebra a privacidade do AVA.
- Excluir uma homework remove tambem respostas ja enviadas; a UI deve manter confirmacao antes da server action.
- Contabilizar `DRAFT` como entrega pode poluir alertas e fila de correcao.
- Reintroduzir criacao automatica por IA pode recriar caixas indevidas sobre o PDF e precisa de controle explicito da teacher.
- Mudar coordenadas para pixels fixos prejudica responsividade.
- A OpenAI pode ter custo por uso; validar modelo, limites, privacidade e volume antes de reativar OCR em uploads reais.
- Usar preset de PDF agressivo pode reduzir legibilidade de materiais do Canva; manter `ebook` salvo motivo claro e revisar PDF pesado manualmente.

## Pendencias

- Nao ha importacao em lote de homeworks do Canva.
- Nao ha exportacao da resposta preenchida como PDF final.
- Nao ha auditoria especifica de cada autosave.

## Como pode evoluir no futuro

- Exportar resposta do aluno preenchida em PDF.
- Permitir anexos extras por homework.
- Adicionar historico visual de entregas e refacoes.
