# 15 - Homework Interativo

## O que esta parte do sistema faz

O homework interativo permite que a teacher envie um PDF ou imagem exportado do Canva, ajuste campos de resposta sobre o arquivo e deixe o aluno responder online dentro do AVA. O aluno escreve por cima do arquivo, o rascunho e salvo automaticamente e a entrega vira evento novo para teacher/admin corrigirem.

O fluxo interativo e o modo de criacao usado na interface atual. O homework simples de pergunta/resposta fica apenas como legado para atividades antigas ja existentes.

## Arquivos, rotas, componentes, tabelas ou servicos envolvidos

Arquivos principais:

- `src/app/ava/teacher/actions.ts`
- `src/app/ava/student/actions.ts`
- `src/app/ava/teacher/page.tsx`
- `src/app/ava/student/page.tsx`
- `src/app/ava/homework-assets/[homeworkId]/route.ts`
- `src/components/ava/teacher-forms.tsx`
- `src/components/ava/teacher-workspace.tsx`
- `src/components/ava/student-workspace.tsx`
- `src/components/ava/interactive-homework-editor.tsx`
- `src/components/ava/interactive-homework-student.tsx`
- `src/lib/homework-ocr.ts`
- `src/lib/storage.ts`
- `src/lib/validations/learning.ts`
- `next.config.ts`
- `prisma/schema.prisma`
- `prisma/migrations/20260512120000_interactive_homework/migration.sql`

Rotas:

- `/ava/teacher?task=criar-homework`
- `/ava/teacher?task=corrigir-respostas`
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
- A criacao seleciona teacher e aluno; o sistema cria uma aula interna automaticamente para manter o vinculo de permissao do homework.
- Homework interativo precisa continuar ligado a uma aula com aluno definido, mesmo quando essa aula for criada automaticamente.
- O arquivo fica em `storage/homework-assets` ou no volume Docker equivalente, nunca no Git.
- O tamanho maximo aceito pela UI/storage e 14 MB; `next.config.ts` usa 15 MB para a Server Action receber o arquivo com folga.
- O acesso ao arquivo passa por rota protegida; student so abre arquivo da propria homework.
- Campos usam coordenadas percentuais (`x`, `y`, `width`, `height`) para se adaptar ao tamanho da tela.
- O PDF/imagem original deve permanecer visivel como fundo; campos de resposta sao overlays transparentes e nao devem redesenhar, cobrir ou substituir o arquivo.
- A IA deve sugerir campos apenas sobre lacunas, linhas de resposta, caixas vazias ou checkboxes, evitando enunciados, instrucoes, titulos e texto impresso.
- `ADMIN` ou a `TEACHER` dona da homework pode excluir uma homework interativa pela lista de criacao.
- Excluir homework interativa remove campos, perguntas e respostas por cascade; tambem remove a aula interna automatica quando ela ficou vazia.
- `DRAFT` e apenas rascunho/autosave e nao entra na fila de correcao.
- `SUBMITTED` e entrega oficial e gera evento para teacher/admin.
- `RETURNED` libera o aluno para refazer.
- `REVIEWED` bloqueia nova entrega e preserva feedback.
- OCR/IA e opcional; controle manual sempre deve existir.

## Decisoes tecnicas tomadas

- O modo do homework fica em `Homework.kind`, com `TEXT` como padrao para preservar o comportamento antigo.
- A interface de criacao nova removeu o formulario `TEXT`; esse modo permanece no banco apenas para compatibilidade com registros antigos.
- Metadados do arquivo ficam no proprio `Homework` para evitar tabela extra nesta fase.
- Campos interativos ficam em `HomeworkInteractiveField`, com cascade quando a homework for apagada futuramente.
- A exclusao de homework interativa usa server action com validacao de role/dono e tenta remover o arquivo fisico de `storage/homework-assets` apos apagar os registros.
- A rota `/ava/homework-assets/[homeworkId]` reutiliza o padrao de contratos protegidos.
- A deteccao usa OpenAI Responses API quando `OPENAI_API_KEY` existe e retorna JSON estruturado com posicoes de campos transparentes.
- Sem chave OpenAI ou em caso de erro, o sistema cria campos iniciais de fallback e permite ajuste manual.
- A primeira versao renderiza PDF/imagem em um canvas visual com overlay HTML transparente; PDFs longos podem exigir ajuste manual.

## Riscos ao alterar esta parte

- Expor arquivo direto por URL publica quebra a privacidade do AVA.
- Excluir uma homework remove tambem respostas ja enviadas; a UI deve manter confirmacao antes da server action.
- Contabilizar `DRAFT` como entrega pode poluir alertas e fila de correcao.
- Remover fallback manual deixa o fluxo dependente de IA e pode travar ambientes sem chave.
- Mudar coordenadas para pixels fixos prejudica responsividade.
- A OpenAI pode ter custo por uso; validar modelo, limites e volume antes de uso intenso.

## Pendencias

- Editor multipagina dedicado para PDFs longos.
- Reposicionamento por arrastar ainda nao existe; o ajuste manual atual usa campos numericos.
- Nao ha importacao em lote de homeworks do Canva.
- Nao ha exportacao da resposta preenchida como PDF final.
- Nao ha auditoria especifica de cada autosave.

## Como pode evoluir no futuro

- Adicionar drag-and-drop para mover campos.
- Renderizar cada pagina do PDF como pagina separada com campos por pagina.
- Exportar resposta do aluno preenchida em PDF.
- Permitir anexos extras por homework.
- Adicionar historico visual de entregas e refacoes.
