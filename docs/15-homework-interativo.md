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
- `src/components/ava/interactive-homework-listening.tsx`
- `src/components/ava/interactive-homework-review.tsx`
- `src/components/ava/interactive-homework-student.tsx`
- `src/app/ava/homework-listening-detect/route.ts`
- `src/app/ava/homework-listening/[fieldId]/route.ts`
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
- `/ava/homework-listening-detect`
- `/ava/homework-listening/[fieldId]`

Tabelas e enums:

- `Homework`
- `HomeworkInteractiveField`
- `HomeworkSubmission`
- `HomeworkKind`
- `HomeworkFieldType`
- `SubmissionStatus`

## Regras de negocio que precisam ser preservadas

- Apenas `ADMIN` ou `TEACHER` vinculada ao aluno pode criar e ajustar homework interativo.
- A aba `Criar/Ver Aulas` usa a mesma base tecnica do homework interativo, mas marca a atividade como `fieldDetectionSource=lesson-manual` para separar a lista de aulas interativas da lista de homeworks interativas.
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
- Na tela do aluno, as areas de escrita mostram guias discretas com `texto` em cada linha para indicar onde iniciar a resposta, sem borda pesada, fundo opaco ou caixa HTML propria; checkbox e desenho continuam aparecendo apenas como a marca selecionada ou os tracos desenhados.
- A criacao nova nasce sem campos automaticos; a teacher escolhe o tipo de area e desenha no tamanho desejado diretamente sobre a pagina.
- A criacao de homework/aula interativa permite selecionar varios PDFs/imagens no mesmo formulario; cada arquivo e enviado em fila sequencial e vira uma atividade separada com titulo baseado no nome do arquivo quando o titulo manual fica vazio.
- A tela `Criar/Ver Homework` mantem a criacao em blocos visuais separados para selecao/dados, instrucoes/upload e fila de criacao; a lista mostra atividade, aluno, status de salvamento e quantidade de areas antes de abrir o editor.
- No editor da teacher, cada area manual deve exibir uma previa discreta do resultado final (`x` centralizado, texto exemplo alinhado como a resposta do aluno ou area de desenho) para deixar claro onde a resposta aparecera.
- A area selecionada no editor da teacher deve ficar mais visivel com borda forte, etiqueta do tipo de area, alca de redimensionamento destacada e, em campos de texto, contador de linhas legivel.
- A teacher usa uma unica ferramenta `Texto` para areas de escrita; o editor escolhe internamente entre linha curta e area longa conforme a altura do quadro desenhado.
- A teacher tambem pode usar a ferramenta `Letra/Num` para criar uma caixinha pequena `TINY_TEXT`, propria para V/F, A/B/C/D, numeros curtos ou letras de correspondencia, diferente de `CHECKBOX`.
- A teacher pode usar a ferramenta `Listening` para desenhar uma area sobre um trecho do PDF/imagem com uma ou mais frases; ao criar ou reler o box, o servidor tenta ler automaticamente o texto dentro da area com Gemini, preenche o texto do listening para conferencia manual e deixa o icone de volume automaticamente no fim direito do box.
- Campos de texto baixos devem aceitar lacunas precisas; campos maiores viram area de texto longa. O tamanho da fonte se adapta ao quadro desenhado pela teacher, usa toda a largura/altura util e deve aparecer de forma equivalente no editor, na resposta do aluno e na correcao.
- No editor da teacher, campos de texto mostram guias discretas de linha, `texto` em cada linha e contador de linhas enquanto a area e criada ou selecionada; no aluno, a mesma guia aparece de forma mais leve para orientar redacoes, e na correcao final continua aparecendo apenas a resposta entregue.
- Campos `TINY_TEXT` aparecem para o aluno como caixinha pequena, centralizada, aceitam ate 2 caracteres e normalizam letras/numeros para maiusculas tambem no servidor antes de salvar.
- A ferramenta `Marcar` cria uma marca pequena e centralizada quando a teacher clica no PDF; se arrastar, mantem um quadrado proporcional em pixels para alinhar melhor com caixas, parenteses e lacunas ja impressas no material.
- A ferramenta `Desenho` cria uma area centralizada quando usada por clique e uma area livre quando usada por arrasto; o editor mostra uma previa discreta de canvas para orientar tamanho e posicao.
- O editor deve permitir mover, redimensionar, excluir a area selecionada e limpar todas as areas antes de salvar; o botao `Limpar tudo` pede confirmacao antes de apagar todas as areas, e as teclas `Delete` e `Backspace` tambem removem a area selecionada quando o foco nao esta em um campo de texto.
- O salvamento das areas deve confirmar a quantidade persistida no banco, devolver as areas salvas para reconciliar o estado local do editor e avisar a teacher quando houver alteracoes nao salvas antes de recarregar ou sair da pagina.
- O editor salva automaticamente as areas alguns segundos depois que a teacher para de criar, mover, redimensionar ou excluir campos; o botao `Salvar areas` continua existindo para forcar a gravacao manual, e falha de autosave nao remove as areas da tela. Quando a falha acontece, o aviso deve deixar claro que as areas ainda nao foram confirmadas e oferecer acao manual para salvar novamente antes de sair.
- Campos podem ser `TINY_TEXT`, `SHORT_TEXT`, `LONG_TEXT`, `CHECKBOX`, `DRAWING` ou `LISTENING`; `TINY_TEXT` salva letras/numeros curtos, `DRAWING` salva tracos vetoriais normalizados dentro do JSON de respostas, e `LISTENING` nao salva resposta do aluno, apenas toca o texto configurado pela teacher.
- O botao de `LISTENING` alterna por clique entre velocidade normal e um pouco mais devagar, usando a rota protegida `/ava/homework-listening/[fieldId]` e OpenAI text-to-speech no servidor quando `OPENAI_API_KEY` estiver configurada.
- A leitura automatica do texto do `LISTENING` usa a rota protegida `/ava/homework-listening-detect`; no editor, o client tenta enviar primeiro um recorte da area renderizada para reduzir atraso e melhorar precisao, mantendo fallback para o PDF/imagem protegido com coordenadas percentuais quando o recorte nao estiver disponivel. A rota retorna apenas o texto detectado; `STUDENT` nao acessa essa rota.
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
- O envio em lote nao cria endpoint novo: o client monta uma fila e chama a mesma server action segura uma vez por arquivo, em sequencia. Falha individual nao cancela arquivos ja criados, e a lista do editor e atualizada apos cada sucesso.
- O editor manual cria `HomeworkInteractiveField` somente quando a teacher desenha e salva as areas sobre o arquivo.
- Campos de texto usam um helper visual compartilhado para calcular a quantidade de linhas pelo tamanho real do quadro desenhado, com limite alto o suficiente para redacoes em areas grandes; a teacher define o limite pratico aumentando ou reduzindo a altura do campo.
- Campos `TINY_TEXT` usam helper compartilhado para limitar a resposta a 2 caracteres alfanumericos, mostrar preview `A` no editor e renderizar a entrega centralizada no aluno e na correcao.
- Campos `LISTENING` usam o `placeholder` de `HomeworkInteractiveField` para guardar o texto falado, normalizam espacos e limitam o texto configurado; o editor tenta preencher esse texto automaticamente lendo um recorte menor da area desenhada com Gemini quando possivel, permite ajuste manual em um campo estavel que aceita textos mais longos com varias frases ou releitura do box, mostra preview do icone sem escrever a frase por cima do PDF, o aluno/revisor ve apenas o botao de volume ancorado no fim direito da area e as rotas de deteccao/audio validam role e acesso ao homework antes de chamar Gemini/OpenAI conforme o recurso.
- Campos `CHECKBOX` usam criacao/redimensionamento em quadrado visual por pixel e podem ser menores que campos de texto para alinhar a marca exatamente dentro de parenteses ou caixinhas ja existentes no PDF.
- A marca de `CHECKBOX` deve ser exibida de forma adaptativa no editor, na resposta do aluno e na correcao, mantendo apenas o `X` visivel para o aluno.
- A interface mostra apenas `Texto` para criacao de escrita; no banco, a area e normalizada como `SHORT_TEXT` ou `LONG_TEXT` de acordo com a altura para manter compatibilidade com aluno, correcao e atividades antigas. A mesma base de estilo calcula fonte adaptativa e quantidade aproximada de linhas possiveis.
- O salvamento do editor preserva IDs de areas ja existentes, cria apenas areas novas, remove as areas excluidas e valida a contagem final dentro da transacao. Isso evita que um save grande troque todos os IDs sem necessidade e reduz risco de diferenca entre editor, banco e tela do aluno.
- O autosave do editor usa debounce, nao roda durante pointer drag e reaproveita a mesma server action segura do botao manual. Se a teacher continuar mexendo enquanto uma gravacao esta em andamento, o retorno apenas reconcilia IDs persistidos e deixa a nova alteracao pendente para o proximo autosave.
- O desenho usa helper compartilhado para serializar, validar e renderizar os tracos no aluno e na correcao, evitando diferenca visual entre o que o aluno desenhou e o que a teacher revisa.
- O helper de OCR/OpenAI permanece isolado em `src/lib/homework-ocr.ts`, mas nao faz parte do fluxo padrao atual.
- Imagens usam a dimensao natural como pagina unica; PDFs podem renderizar multiplas paginas e campos podem ser direcionados por numero de pagina.

## Riscos ao alterar esta parte

- Expor arquivo direto por URL publica quebra a privacidade do AVA.
- Excluir uma homework remove tambem respostas ja enviadas; a UI deve manter confirmacao antes da server action.
- Contabilizar `DRAFT` como entrega pode poluir alertas e fila de correcao.
- Reintroduzir criacao automatica por IA pode recriar caixas indevidas sobre o PDF e precisa de controle explicito da teacher.
- Mudar coordenadas para pixels fixos prejudica responsividade.
- Gemini/OpenAI podem ter custo por uso; a leitura automatica de `LISTENING` usa Gemini e tenta enviar apenas o recorte do box para reduzir atraso e custo, entao deve ser usada em materiais pedagogicos autorizados e conferida pela teacher antes de salvar.
- Campos `LISTENING` tambem usam OpenAI por clique no botao de audio; manter o texto curto e objetivo, disclosure de voz gerada por IA e rota protegida para nao expor chave ou permitir acesso fora do aluno/teacher/admin autorizado.
- Usar preset de PDF agressivo pode reduzir legibilidade de materiais do Canva; manter `ebook` salvo motivo claro e revisar PDF pesado manualmente.

## Pendencias

- Nao ha exportacao da resposta preenchida como PDF final.
- Nao ha auditoria especifica de cada autosave.

## Como pode evoluir no futuro

- Exportar resposta do aluno preenchida em PDF.
- Permitir anexos extras por homework.
- Adicionar historico visual de entregas e refacoes.
