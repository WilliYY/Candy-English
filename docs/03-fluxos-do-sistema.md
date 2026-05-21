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

Componentes:

- `src/components/ava/ava-dashboard.tsx`
- `src/components/ava/admin-users-panel.tsx`
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
3. Admin pode criar usuarios, ativar/desativar, vincular aluno-teacher, enviar contratos, controlar manutencao e gerenciar financeiro.
4. Admin tambem tem atalhos para tarefas da area teacher.

### Teacher

1. Teacher entra em `/ava/teacher`.
2. Ve alunos vinculados.
3. Cria aula, material, vocabulario e homework interativo por arquivo do Canva.
4. Corrige respostas e envia feedback.
5. Pode abrir aula ao vivo e mensagens.

### Student

1. Student entra em `/ava/student`.
2. Ve aulas, materiais, homework interativo, mensagens, contratos, perfil e aula ao vivo.
3. Responde homework online; no modo interativo digita, marca ou desenha sobre o arquivo e o rascunho e salvo automaticamente.
4. Visualiza feedback.
5. Edita dados pessoais permitidos, mas nao o nivel.

### Homework interativo

1. Teacher abre `/ava/teacher?task=criar-homework`.
2. Seleciona teacher e aluno, informa titulo/instrucoes e envia PDF/imagem exportado do Canva.
3. O sistema cria uma aula interna automaticamente para vincular a homework ao aluno e a teacher.
4. O arquivo e salvo em `storage/homework-assets` e servido por `/ava/homework-assets/[homeworkId]`.
5. A homework nasce sem campos automaticos: a teacher escolhe o tipo de area (`Texto curto`, `Texto longo`, `Marcar` ou `Desenho`) e desenha diretamente sobre o PDF/imagem.
6. Teacher pode mover, redimensionar, excluir uma area selecionada ou limpar todas as areas antes de salvar, mantendo o PDF/imagem original visivel como fundo.
7. Teacher ou admin pode excluir uma homework interativa na lista de criacao; a exclusao remove campos, perguntas, respostas e a aula interna automatica quando ela ficou vazia.
8. Student abre `/ava/student?task=homeworks`, clica no bloco recolhido e responde sobre o arquivo renderizado na proporcao original; PDFs aparecem pagina a pagina.
9. Enquanto edita, a submissao fica `DRAFT`; ao clicar em entregar, vira `SUBMITTED` e aparece para teacher/admin como evento novo.
10. Teacher pode abrir uma previa da resposta sobre o arquivo, corrige com feedback (`REVIEWED`) ou libera `RETURNED` para o aluno refazer.

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
- Excluir homework interativa exige permissao server-side de admin ou teacher dona da homework.
- Draft de homework interativo nao deve aparecer como resposta entregue para teacher.
- Arquivo de homework interativo deve ser acessado apenas por admin, teacher dona da aula ou aluno dono da homework.
- Aula ao vivo usa Jitsi embutido se nao houver link externo.
- Mensagem teacher/aluno exige vinculo.
- Contratos e avatar exigem sessao.
- Agenda e financeiro sao internos do admin.

## Decisoes tecnicas tomadas

- O fluxo `/ava` nao exibe cards publicos; ele redireciona.
- Google login e opcional e so aceita emails ja cadastrados.
- Alertas visuais da sidebar usam assinaturas por modulo e localStorage no navegador.
- Financeiro usa estrutura recorrente por aluno com snapshots mensais para preservar historico fechado.
- Agenda usa ocorrencias por data para facilitar presenca e reposicao.
- Homework interativo usa arquivo protegido, renderizacao fiel do PDF/imagem e campos percentuais desenhados manualmente por pagina.

## Riscos ao alterar esta parte

- Mudar task ids quebra links profundos.
- Mostrar mais de uma tarefa grande por tela pode poluir o AVA.
- Remover validacao server-side pode vazar dados.
- Alterar bloqueio de manutencao pode impedir admins/teachers de operar.

## Pendencias

- Edicao/delecao completa de aulas e materiais ainda nao existe; homework interativa ja pode ser excluida na tela de criacao.
- Upload livre de materiais e editor Word embutido ainda nao existem.
- Notificacoes por email/WhatsApp ainda nao existem.

## Como pode evoluir

- Criar fluxos dedicados para reset de senha.
- Adicionar importacao em massa de alunos.
- Expandir homework para multiplas perguntas e anexos.
- Criar auditoria administrativa mais ampla.
