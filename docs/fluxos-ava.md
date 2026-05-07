# Fluxos do AVA Candy English

Este documento explica, em portugues simples, como funcionam as FASES 4, 5 e 6 do AVA Candy English.

## Papeis

- **ADMIN**: administra usuarios e pode supervisionar o AVA.
- **TEACHER**: cria aulas, materiais, vocabulario, homeworks e corrige respostas.
- **STUDENT**: acessa aulas, estuda materiais/vocabulario, responde homeworks e ve feedback.

## Visao Geral

```mermaid
flowchart LR
  A["ADMIN cadastra usuarios"] --> B["ADMIN vincula aluno a teacher"]
  B --> C["TEACHER cria aula"]
  C --> D["TEACHER adiciona material e vocabulario"]
  D --> E["TEACHER cria homework"]
  E --> F["STUDENT responde online"]
  F --> G["TEACHER corrige"]
  G --> H["STUDENT ve feedback"]
```

## FASE 4 - Aulas, Materiais e Vocabulario

```mermaid
flowchart TD
  A["TEACHER entra em /ava/teacher"] --> B["Cria aula"]
  B --> C["Escolhe teacher e aluno"]
  C --> D["Define titulo, resumo e data"]
  D --> E["Adiciona primeiro material"]
  D --> F["Adiciona primeiro vocabulario"]
  E --> G["Aula fica disponivel"]
  F --> G
  G --> H["STUDENT entra em /ava/student"]
  H --> I["Aluno ve aula, materiais e vocabulario"]
```

Regras:

- `ADMIN` pode ver a area teacher para supervisao.
- `TEACHER` cria aulas.
- `TEACHER` ve apenas alunos vinculados a sua area.
- `ADMIN` pode criar vinculo aluno-teacher em `/ava/admin`.
- `ADMIN` tambem pode criar o primeiro vinculo aluno-teacher ao criar uma aula.
- Aula vinculada a um aluno aparece para esse aluno.
- PostgreSQL continua interno no Docker.

## FASE 5 - Homework e Resposta

```mermaid
flowchart TD
  A["TEACHER escolhe uma aula"] --> B["Cria homework"]
  B --> C["Define titulo, instrucoes, prazo e pergunta"]
  C --> D["Homework aparece para o aluno da aula"]
  D --> E["STUDENT escreve resposta"]
  E --> F["STUDENT envia resposta"]
  F --> G["Sistema salva HomeworkSubmission"]
  G --> H["TEACHER ve resposta pendente"]
```

Regras:

- Homework sempre pertence a uma aula.
- Resposta do aluno fica vinculada ao perfil `StudentProfile`.
- O aluno so envia homework vinculada ao proprio perfil.
- Se o aluno reenviar, a resposta anterior e atualizada.
- Depois que a resposta recebe feedback, o reenvio fica bloqueado para preservar a correcao.

## FASE 6 - Correcao e Feedback

```mermaid
flowchart TD
  A["TEACHER abre respostas enviadas"] --> B["Le pergunta e resposta"]
  B --> C["Escreve feedback"]
  C --> D["Sistema marca como REVIEWED"]
  D --> E["STUDENT ve feedback em /ava/student"]
```

Regras:

- `TEACHER` so corrige respostas de homeworks das proprias aulas.
- `ADMIN` pode supervisionar.
- Feedback fica salvo em `HomeworkSubmission.feedback`.
- Quando corrigida, a resposta muda de `SUBMITTED` para `REVIEWED`.

## FASES 7 a 10 - Visual, Login e Admin

```mermaid
flowchart TD
  A["Visitante acessa site"] --> B["Home visual com movimento"]
  B --> C["Contato ou entrada no AVA"]
  C --> D["/ava/login"]
  D --> E["Auth.js valida credenciais"]
  E --> F{"Usuario ativo?"}
  F -->|Nao| G["Login negado"]
  F -->|Sim| H{"Role"}
  H --> I["ADMIN: gestao de usuarios e vinculos"]
  H --> J["TEACHER: aulas, homeworks e feedback"]
  H --> K["STUDENT: aulas e respostas"]
```

Regras:

- Usuario com `isActive=false` nao entra no AVA.
- Muitas falhas recentes de login bloqueiam novas tentativas por seguranca basica.
- Menu do AVA muda conforme role, mas a permissao real continua no servidor.
- Admin nao pode desativar o proprio usuario.
- O sistema deve manter pelo menos um admin ativo.
- Vinculo aluno-teacher orienta quais alunos aparecem para a teacher.

## FASES 11 a 13 - Sidebar, Aula Ao Vivo, Contratos e Catty

```mermaid
flowchart TD
  A["Usuario entra no AVA"] --> B{"Role"}
  B --> C["ADMIN: usuarios, conteudo do site, vinculos"]
  B --> D["TEACHER: aulas, homeworks, contratos, aula ao vivo"]
  B --> E["STUDENT: aulas, perfil, contratos, botao ao vivo"]
  D --> F["Teacher abre LiveSession com link Google Meet"]
  F --> G["Aluno logado ve Aula ao vivo"]
  G --> H["Aluno abre Google Meet"]
  C --> I["Admin sobe contrato PDF"]
  D --> I
  I --> J["Aluno autorizado visualiza PDF protegido"]
```

Regras:

- Aula ao vivo usa Google Meet nesta fase.
- O AVA nao libera o link para visitante sem login.
- Contratos PDF sao servidos por rota protegida.
- Foto do perfil aceita PNG, JPG ou WebP ate 2 MB.
- Contrato aceita PDF ate 8 MB.
- Catty e interface visual; IA real ainda nao esta conectada.
- Catty aparece no site institucional e no login, mas fica oculto nos paineis logados para nao cobrir a operacao do AVA.
- As animacoes decorativas com video, balas e GIFs foram removidas para reduzir distracao e consumo de recursos.

## Sidebar Operacional

```mermaid
flowchart LR
  A["Usuario logado"] --> B["Sidebar por role"]
  B --> C["Grupo ADMIN"]
  B --> D["Grupo TEACHER"]
  B --> E["Grupo STUDENT"]
  C --> C1["Usuarios, criar admin, criar teacher, criar aluno, vincular aluno, editar site"]
  D --> D1["Aula ao vivo, criar aula, criar homework, mensagens, corrigir, contratos"]
  E --> E1["Aula ao vivo, aulas, homeworks, mensagens, contratos, perfil"]
  C --> F["Clique troca a tarefa principal do admin"]
  D --> F
  E --> F
```

Regras:

- A sidebar deve ser o indice principal de operacao do AVA.
- Grupos como `Teacher` e `Student` abrem subcategorias ao clicar, para evitar uma lista longa e poluida.
- No admin, os atalhos usam `?task=usuarios`, `?task=criar-admin`, `?task=criar-teacher`, `?task=criar-aluno`, `?task=vincular-aluno` e `?task=editar-site` para mostrar uma tarefa por vez.
- Nas areas teacher/student, os atalhos tambem usam `?task=` para mostrar uma tarefa por vez.
- Os campos e tabelas continuam no painel da direita, mas cada bloco precisa ter um atalho claro quando virar tarefa importante.
- Nao usar uma caixa interna com barra de rolagem para atalhos; se houver muitas opcoes, agrupar por role.

## Fluxo Admin Por Tarefa

```mermaid
flowchart TD
  A["ADMIN abre /ava/admin"] --> B["task padrao: usuarios"]
  B --> C["Lista usuarios e status"]
  A --> D["?task=criar-admin"]
  A --> E["?task=criar-teacher"]
  A --> F["?task=criar-aluno"]
  F --> F1["Nome completo, data de nascimento, documento/responsavel, email/login e senha provisoria"]
  A --> G["?task=vincular-aluno"]
  G --> G1["Seleciona teacher e aluno ativo"]
  A --> H["?task=editar-site"]
  H --> H1["Liga ou desliga modo manutencao"]
```

## Fluxo Manutencao Candy

```mermaid
flowchart TD
  A["ADMIN abre /ava/admin?task=editar-site"] --> B["Clica em modo manutencao"]
  B --> C["AppSetting maintenanceMode = on"]
  C --> D{"Usuario tentando entrar"}
  D -->|ADMIN| E["Entra normalmente"]
  D -->|TEACHER| F["Entra normalmente"]
  D -->|STUDENT| G["Login bloqueado ou tela Manutencao Candy"]
  B --> H["ADMIN desliga manutencao"]
  H --> I["Alunos voltam a entrar"]
```

Regras:

- Modo manutencao nao mexe no `.env`.
- Modo manutencao nao apaga dados.
- O bloqueio e aplicado no login e tambem na pagina student para quem ja tinha sessao.

## Fluxo Chatbox Teacher/Aluno

```mermaid
flowchart TD
  A["ADMIN vincula aluno a teacher"] --> B["Existe StudentTeacherAssignment"]
  B --> C["Teacher abre /ava/teacher?task=mensagens"]
  B --> D["Student abre /ava/student?task=mensagens"]
  C --> E["Envia mensagem"]
  D --> F["Responde mensagem"]
  E --> G["Sistema cria ou reutiliza ChatThread"]
  F --> G
  G --> H["Sistema grava ChatMessage"]
```

Regras:

- Teacher so conversa com aluno vinculado.
- Student so conversa usando o proprio perfil.
- Admin pode supervisionar a area teacher, mas a conversa continua presa ao vinculo teacher-aluno.

## Fluxo Historico De Usuarios

```mermaid
flowchart TD
  A["ADMIN abre /ava/admin?task=usuarios"] --> B["Sistema busca usuarios"]
  B --> C["Agrupa em Admins, Teachers e Alunos"]
  C --> D["Conta relacoes existentes no Prisma"]
  D --> E["Mostra historico no card do usuario"]
```

Regras:

- O historico desta fase e calculado com dados ja existentes.
- Nao existe tabela nova de auditoria nesta fase.
- Teacher mostra aulas, homeworks, feedbacks, contratos, chats e aulas ao vivo.
- Aluno mostra vinculos, aulas recebidas, respostas, contratos, chats e aulas ao vivo.

## Deploy Quando Ha Migration

Use quando `prisma/schema.prisma` ou `prisma/migrations/` mudarem:

```bash
cd /home/ubuntu/candy-english
git pull
docker compose up -d postgres
docker compose build app migrate audit-server-smoke
docker compose --profile tools run --rm migrate
docker compose up -d --force-recreate app
sleep 45
docker compose ps
docker compose --profile tools run --rm audit-server-smoke
```

Termos:

- `git pull`: baixa as alteracoes do GitHub.
- `docker compose build`: cria novas imagens Docker.
- `migrate`: aplica alteracoes no banco.
- `up -d --force-recreate app`: recria o container do site/AVA.
- `ps`: mostra status dos containers.
- `audit-server-smoke`: testa health, home, login e protecao de admin.

## Cuidados

- Nunca versionar `.env`.
- Nunca expor PostgreSQL publicamente.
- Nao colar `AUTH_SECRET`, `DATABASE_URL` ou senhas em prints publicos.
- Depois de expor segredo em tela, rotacionar o valor no `.env` do servidor.
