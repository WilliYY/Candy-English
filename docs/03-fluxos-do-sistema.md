# 03 - Fluxos do Sistema

## O que esta parte do sistema faz

Este documento registra os fluxos principais de uso do Candy English. Ele deve ser atualizado quando uma jornada de usuario, permissao, modulo interno ou comportamento importante mudar.

## Arquivos, rotas, componentes, tabelas ou servicos envolvidos

Rotas:

- `/ava/login`
- `/ava/admin?task=...`
- `/ava/teacher?task=...`
- `/ava/student?task=...`
- `/ava/avatar`
- `/ava/contracts/[contractId]`
- `/api/catty/chat`

Componentes:

- `src/components/ava/ava-dashboard.tsx`
- `src/components/ava/admin-users-panel.tsx`
- `src/components/ava/admin-credentials-panel.tsx`
- `src/components/ava/admin-finance-panel.tsx`
- `src/components/ava/admin-agenda-panel.tsx`
- `src/components/ava/interactive-homework-document.tsx`
- `src/components/ava/interactive-homework-editor.tsx`
- `src/components/ava/interactive-homework-review.tsx`
- `src/components/ava/interactive-homework-student.tsx`
- `src/components/ava/teacher-workspace.tsx`
- `src/components/ava/student-workspace.tsx`
- `src/components/ava/chat-thread-panel.tsx`
- `src/components/ava/live-session-forms.tsx`
- `src/components/ava/profile-forms.tsx`
- `src/components/site/catty-widget.tsx`

Actions:

- `src/app/ava/admin/actions.ts`
- `src/app/ava/teacher/actions.ts`
- `src/app/ava/student/actions.ts`
- `src/app/ava/actions.ts`

## Fluxos principais

### Login

1. Usuario entra em `/ava/login`.
2. Auth.js valida email, senha, usuario ativo e manutencao.
3. Sessao JWT recebe `id` e `role`.
4. Usuario vai para `/ava/admin`, `/ava/teacher` ou `/ava/student`.

### Admin

1. Admin abre `/ava/admin`.
2. A tarefa padrao e `usuarios`.
3. Admin pode criar usuarios, redefinir senhas, ativar/desativar, vincular aluno-teacher, enviar contratos, registrar APIs/senhas, controlar manutencao e gerenciar financeiro.
4. Admin tambem tem atalhos para tarefas da area teacher.

### APIs e senhas

1. Admin abre `/ava/admin?task=apis-senhas`.
2. A pagina sincroniza para `AdminCredential`, de forma criptografada, integracoes externas existentes no `.env` como OpenAI, Google OAuth e dominio Jitsi.
3. Admin pode registrar credenciais manuais com rotulo, servico, tipo, usuario, URL, notas e valor sensivel.
4. O valor sensivel fica oculto por padrao; para copiar ou conferir, admin precisa clicar em `Revelar`.
5. Credenciais manuais podem ser editadas ou excluidas; credenciais vindas do `.env` devem ser alteradas no servidor.

### Teacher

1. Teacher entra em `/ava/teacher`.
2. Ve alunos vinculados.
3. Cria aula interativa e homework interativo por arquivo do Canva.
4. Corrige respostas e envia feedback.
5. Pode abrir aula ao vivo e mensagens.

### Student

1. Student entra em `/ava/student`.
2. Ve aulas, materiais, homework interativo, mensagens, contratos, perfil e aula ao vivo.
3. Responde homework online; no modo interativo digita, marca ou desenha sobre o arquivo e o rascunho e salvo automaticamente.
4. Visualiza feedback.
5. Edita dados pessoais permitidos, mas nao o nivel.

### Catty

1. Usuario abre a Catty no canto inferior direito do site, login ou paineis do AVA.
2. Widget identifica apenas contexto leve da tela atual (`area` e `task`) para adaptar titulo, texto de apoio e atalhos de estudo.
3. Widget envia a mensagem atual, ate 8 mensagens recentes e esse contexto leve para `/api/catty/chat`.
4. A rota valida o payload com Zod, aplica limite simples por IP e usa OpenAI Responses API quando `OPENAI_API_KEY` existe.
5. Sem chave, erro de API ou resposta fora da personalidade, a Catty usa o fallback local com orientacoes de estudo, homework, aula ao vivo e pratica simples em ingles.
6. Quando o usuario escreve em ingles, a resposta deve vir em ingles simples; em portugues, a resposta deve ficar em portugues brasileiro.
7. Em homework e aula interativa, Catty ajuda a entender o enunciado, dar pistas e criar exemplos parecidos, mas nao entrega a resposta final.

### Aula ao vivo

1. Teacher abre `/ava/teacher?task=aula-ao-vivo`.
2. Configura teacher, aluno ou turma geral, titulo, link externo opcional e datas opcionais no bloco superior.
3. Se o link externo ficar vazio, o AVA cria automaticamente uma sala Jitsi Meet embutida usando o dominio configurado em `NEXT_PUBLIC_LIVE_CLASS_JITSI_DOMAIN`.
4. Se o link for Google Meet, a sala fica registrada e abre em nova aba; se for um dominio Jitsi aceito pelo AVA, o AVA tenta embutir a sala.
5. A sala ativa aparece abaixo das opcoes, com o video centralizado como superficie principal.
6. Student abre `/ava/student?task=aula-ao-vivo` e entra na mesma sala ativa liberada para ele.
7. Teacher encerra ou reabre a sala pelo botao no topo do card da propria aula ao vivo.

### Aula interativa

1. Teacher abre `/ava/teacher?task=criar-aula`.
2. Seleciona teacher e aluno, informa titulo/resumo/data e envia PDF/imagem exportado do Canva.
3. O sistema cria uma `Lesson` real para o aluno e uma atividade `Homework.kind=INTERACTIVE` vinculada a essa aula, marcada com `fieldDetectionSource=lesson-manual`.
4. A aula aparece na lista de aulas, e a atividade interativa usa o mesmo editor manual de areas do homework.
5. Teacher pode mover, redimensionar, excluir uma area selecionada ou limpar todas as areas antes de salvar.
6. Student responde essa atividade dentro de `/ava/student?task=aulas`, no card da propria aula, com campos invisiveis sobre o arquivo e autosave.

### Homework interativo

1. Teacher abre `/ava/teacher?task=criar-homework`.
2. Seleciona teacher e aluno, informa titulo/instrucoes e envia PDF/imagem exportado do Canva.
3. O sistema cria uma aula interna automaticamente para vincular a homework ao aluno e a teacher.
4. O arquivo e salvo em `storage/homework-assets` e servido por `/ava/homework-assets/[homeworkId]`.
5. A homework nasce sem campos automaticos: a teacher escolhe o tipo de area (`Texto curto`, `Texto longo`, `Marcar` ou `Desenho`) e desenha diretamente sobre o PDF/imagem.
6. Teacher pode mover, redimensionar, excluir uma area selecionada ou limpar todas as areas antes de salvar; o editor mostra uma previa do `x`, do texto exemplo ou da area de desenho para facilitar o posicionamento exato.
7. Teacher ou admin pode excluir uma homework interativa na lista de criacao; a exclusao remove campos, perguntas, respostas e a aula interna automatica quando ela ficou vazia.
8. Student abre `/ava/student?task=homeworks`, clica no bloco recolhido e responde sobre o arquivo renderizado na proporcao original; PDFs aparecem pagina a pagina e as areas de resposta ficam invisiveis ate receberem texto, marca ou desenho.
9. Em areas `DRAWING`, o aluno pode desenhar com mouse ou dedo e desfazer o ultimo traco sem limpar todo o desenho.
10. Enquanto edita, a submissao fica `DRAFT`; ao clicar em entregar, vira `SUBMITTED` e aparece para teacher/admin como evento novo.
11. Teacher pode abrir uma previa da resposta sobre o arquivo, corrige com feedback (`REVIEWED`) ou libera `RETURNED` para o aluno refazer.

### Financeiro

1. Admin abre `/ava/admin?task=financeiro`.
2. Seleciona um mes de 2026.
3. Adiciona aluno financeiro; ele passa a existir do mes selecionado em diante.
4. Marca status pago/pendente e registra data paga/observacao mensal.
5. Edita dados do aluno do mes selecionado em diante, mantendo meses anteriores fechados.
6. Retira aluno apenas do mes atual; o proximo mes continua puxando as linhas ativas ja existentes.
7. Exporta PDF/Excel e acompanha log em card separado.

### Agenda

1. Admin abre `/ava/admin?task=agenda`.
2. Cadastra aluno, telefone opcional, dias da semana e horario.
3. O sistema cria ocorrencias de aula do mes selecionado ate dezembro de 2026.
4. Admin marca se o aluno foi, faltou ou reseta a presenca.
5. Quando o aluno falta, admin pode cadastrar uma reposicao com data e horario.
6. A tela mostra alunos do dia e proximas aulas com horario.
7. No bloco `Hoje`, admin pode confirmar presenca rapidamente pelo icone verde, registrar falta pelo icone vermelho ou abrir `Reagendar`.
8. Ao clicar no nome do aluno em `Hoje` ou `Proximas aulas`, a tela rola ate a linha mensal daquele aluno.
9. Aulas de hoje sem acao saem da fila visual depois de 2 horas do horario previsto, sem apagar o registro.

### Manutencao

1. Admin liga manutencao em `/ava/admin?task=editar-site`.
2. `AppSetting` salva o estado.
3. Students ficam bloqueados; admins e teachers continuam acessando.

## Regras de negocio que precisam ser preservadas

- Query `?task=` controla a tarefa principal em admin, teacher e student.
- Sidebar deve ser indice operacional, sem caixa interna de rolagem.
- Student tem botoes sempre visiveis.
- Homework corrigida nao deve ser reenviada.
- A interface de criacao nova de homework deve usar o modo interativo; homework simples fica apenas como legado de dados antigos.
- A interface de criacao nova de aula usa o mesmo fluxo interativo de PDF/imagem por enquanto, criando uma aula real com atividade interativa vinculada que aparece em `Aulas e Materiais`, nao em `Responder homework`.
- Excluir homework interativa exige permissao server-side de admin ou teacher dona da homework.
- Draft de homework interativo nao deve aparecer como resposta entregue para teacher.
- Arquivo de homework interativo deve ser acessado apenas por admin, teacher dona da aula ou aluno dono da homework.
- Aula ao vivo usa Jitsi embutido se nao houver link externo; a configuracao fica acima e o video deve ficar centralizado abaixo.
- `meet.jit.si` publico exige conta para quem cria sala e nao deve ser tratado como embed de producao; para teacher/aluno sem conta Jitsi, usar dominio Jitsi dedicado/JaaS configurado no ambiente.
- Catty nao deve solicitar senhas, chaves, documentos sensiveis ou prometer alterar dados internos; problemas de acesso, contratos, pagamentos e cadastro devem ser encaminhados para Candy, teacher ou admin.
- Catty pode usar `area` e `task` da URL para orientar atalhos e linguagem, mas nao pode receber registros internos, respostas salvas, contratos, pagamentos ou credenciais.
- APIs e senhas so podem ser acessadas por `ADMIN`; o painel nunca deve importar `DATABASE_URL`, `AUTH_SECRET`, senhas do Postgres ou senha seed do admin.
- Mensagem teacher/aluno exige vinculo.
- Contratos e avatar exigem sessao.
- Agenda e financeiro sao internos do admin.

## Decisoes tecnicas tomadas

- O fluxo `/ava` nao exibe cards publicos; ele redireciona.
- Google login e opcional e so aceita emails ja cadastrados.
- Alertas visuais da sidebar usam assinaturas por modulo e localStorage no navegador.
- Financeiro usa estrutura recorrente por aluno com snapshots mensais para preservar historico fechado.
- Agenda usa ocorrencias por data para facilitar presenca e reposicao.
- Homework e aula interativa usam arquivo protegido, renderizacao fiel do PDF/imagem e campos percentuais desenhados manualmente por pagina.
- Catty usa IA opcional via rota server-side, mantendo fallback local para ambientes sem `OPENAI_API_KEY`, com atalhos de estudo e resposta contextual por tela.
- O cofre admin criptografa valores sensiveis no servidor e usa `ADMIN_CREDENTIALS_SECRET` ou `AUTH_SECRET` como chave de protecao.

## Riscos ao alterar esta parte

- Mudar task ids quebra links profundos.
- Mostrar mais de uma tarefa grande por tela pode poluir o AVA.
- Remover validacao server-side pode vazar dados.
- Alterar bloqueio de manutencao pode impedir admins/teachers de operar.
- Enviar dados do AVA para a Catty sem necessidade pode criar risco de privacidade; manter a rota limitada ao texto digitado no widget e ao contexto leve de `area`/`task`.
- Revelar credenciais na tela deve ser uma acao consciente do admin; nao adicionar exibicao automatica nem logs do valor em claro.

## Pendencias

- Edicao/delecao completa de aulas e materiais ainda nao existe; aula/homework interativa ja podem ser excluidas nas telas de criacao.
- Upload livre de materiais fora dos fluxos interativos e editor Word embutido ainda nao existem.
- Notificacoes por email/WhatsApp ainda nao existem.

## Como pode evoluir

- Adicionar importacao em massa de alunos.
- Expandir homework para multiplas perguntas e anexos.
- Criar auditoria administrativa mais ampla.
