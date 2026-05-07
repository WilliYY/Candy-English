# Arquitetura - Candy English

## FASE 1

A primeira fase criou uma base limpa e funcional para o site institucional da Candy English e para o AVA em `/ava`.

## FASE 2

A segunda fase implementa login real do AVA, roles e protecao de rotas.

## FASE 3

A terceira fase inicia a gestao administrativa do AVA:

- `/ava/admin` deixa de ser apenas um placeholder e passa a listar usuarios reais;
- `ADMIN` pode cadastrar novos acessos com nome, email, senha temporaria e role;
- ao criar `STUDENT`, o sistema cria tambem `StudentProfile`;
- ao criar `TEACHER`, o sistema cria tambem `TeacherProfile`;
- a senha temporaria e armazenada somente como hash `bcryptjs`;
- o formulario usa React Hook Form e Zod;
- a escrita acontece em server action protegida por sessao `ADMIN`.

## FASE 4

A quarta fase cria a base de aulas, materiais e vocabulario:

- `Lesson` representa uma aula criada por teacher/admin;
- `LessonMaterial` guarda texto ou link de apoio;
- `VocabularyItem` guarda termo, traducao e exemplo;
- aula pode ser vinculada a um `StudentProfile`;
- `/ava/teacher` cria aulas;
- `/ava/student` lista aulas vinculadas ao aluno.

## FASE 5

A quinta fase cria homework online:

- `Homework` pertence a uma aula;
- `HomeworkQuestion` guarda a pergunta inicial;
- `HomeworkSubmission` guarda a resposta do aluno em JSON;
- aluno `STUDENT` envia resposta pela propria area;
- reenviar homework atualiza a submissao existente.

## FASE 6

A sexta fase cria correcao e feedback:

- teacher/admin visualiza respostas enviadas;
- teacher/admin escreve feedback;
- submissao muda de `SUBMITTED` para `REVIEWED`;
- aluno visualiza feedback em `/ava/student`.

## FASE 7

A setima fase melhora a apresentacao institucional:

- site deixa de parecer apenas base tecnica e passa a ter direcao visual propria;
- paleta principal usa roxos, coral suave e fundo claro;
- hero da home usa plano roxo, grid cinetico, cards flutuantes e marquee leve;
- logos enviados pelo projeto ficam em `public/brand/`;
- favicon do site fica em `public/favicon.svg`;
- paginas institucionais usam componentes compartilhados para manter consistencia.

## FASE 8

A oitava fase melhora a experiencia do AVA sem criar dashboard complexo:

- layout `/ava` usa navegacao consciente de role;
- usuario nao logado ve apenas login/site;
- admin ve admin, teacher e student;
- teacher ve teacher e student;
- student ve apenas student;
- tela de login usa composicao visual com marca, mantendo Auth.js no servidor.

## FASE 9

A nona fase endurece operacao administrativa e login:

- `User.isActive` permite bloquear acesso sem excluir historico;
- `LoginAttempt` registra tentativas de login com sucesso/falha;
- login bloqueia usuario inativo;
- login limita falhas repetidas em janela curta;
- admin pode ativar/desativar usuarios;
- admin nao pode desativar o proprio acesso;
- sistema preserva pelo menos um admin ativo;
- admin pode vincular `StudentProfile` a `TeacherProfile` em `/ava/admin`.

## FASE 10

A decima fase consolida documentacao e fluxo:

- README, AGENTS e docs registram as novas decisoes;
- `docs/design-direcao.md` descreve identidade visual e movimento;
- `docs/fluxos-ava.md` registra fluxo atualizado admin -> teacher -> student;
- deploy em producao continua usando Docker Compose, PostgreSQL interno e migrations antes do app quando o schema mudar.

## Endurecimento Operacional

Foi feita uma leitura do repositorio SavePointFinance como referencia externa de robustez operacional: https://github.com/Marks013/SavePointFinance

Foram adaptados para o Candy English apenas os pontos que melhoram a solidez da base atual sem mudar o escopo do AVA:

- healthcheck HTTP em `/api/health`;
- healthcheck Docker do servico `app`;
- rotacao de logs Docker para `app` e `postgres`;
- bind local da porta do app com `APP_HOST_BIND=127.0.0.1`;
- smoke test de servidor em `scripts/server-smoke.ts`;
- servico `audit-server-smoke` no perfil `tools` do Docker Compose;
- checklist de producao em `docs/producao-checklist.md`;
- seed administrativo que preserva senha existente, redefinindo apenas com `ADMIN_RESET_PASSWORD=true`.

Nao foram trazidos elementos especificos do SavePointFinance que nao pertencem ao Candy English nesta fase, como pagamentos, integracoes financeiras, rotinas avancadas de backup criptografado ou automacoes de dominio financeiro.

## Decisoes Registradas

### Produto

- O projeto e uma aplicacao propria, nao WordPress.
- A aplicacao nao depende da HostGator.
- O dominio `candyenglish.com.br` aponta para o servidor Oracle Ubuntu.
- O site institucional e servido em `candyenglish.com.br`.
- O AVA e servido em `candyenglish.com.br/ava`.

### Aplicacao

- Framework: Next.js 15 com App Router.
- Linguagem: TypeScript.
- CSS: Tailwind CSS 4.
- UI base: Shadcn/ui com componentes versionados no proprio repositorio.
- Estado assincrono no cliente: TanStack React Query configurado em `src/app/providers.tsx`.
- Formularios: React Hook Form com validacao Zod.
- Autenticacao: Auth.js / NextAuth v5 com Credentials Provider.
- Sessao: JWT, com `id` e `role` adicionados no token e na session.
- Senhas: hash com `bcryptjs`, compativel com Windows e Linux.
- O Prisma Client e inicializado de forma lazy em `src/lib/prisma.ts`, evitando falhas de build por variaveis de ambiente ainda nao carregadas.
- A gestao inicial de usuarios fica concentrada no `/ava/admin`, sem criar rotas publicas de cadastro.
- Escritas sensiveis usam server actions com `auth()` e validacao por role/dado.
- `TEACHER` nao recebe lista global de alunos; ve apenas alunos ja vinculados por `StudentTeacherAssignment`.
- Menus do AVA sao filtrados por role para facilitar uso, mas a protecao real continua nas paginas e server actions.
- O login rejeita usuario inativo e muitas falhas recentes, reduzindo abuso basico sem depender de servico externo.
- `next.config.ts` adiciona headers basicos de seguranca: anti-iframe, nosniff, referrer policy e bloqueio de camera/microfone/geolocalizacao.

### Rotas

Rotas institucionais:

- `/`
- `/sobre`
- `/metodologia`
- `/planos`
- `/contato`

Rotas do AVA:

- `/ava`
- `/ava/login`
- `/ava/admin`
- `/ava/teacher`
- `/ava/student`

### Autorizacao

A protecao das areas do AVA acontece no servidor, diretamente nas paginas protegidas, usando `auth()` e redirects:

- `/ava/admin`: exige `ADMIN`
- `/ava/teacher`: exige `ADMIN` ou `TEACHER`
- `/ava/student`: exige `ADMIN`, `TEACHER` ou `STUDENT`
- Usuario nao logado e redirecionado para `/ava/login`
- Usuario logado sem permissao e redirecionado para sua area padrao
- Server actions administrativas tambem validam a sessao antes de gravar dados.

Essa decisao evita carregar Prisma/pg em middleware Edge e mantem a autorizacao junto da renderizacao server-side das paginas do AVA.

### Banco de Dados

- Banco: PostgreSQL 17.
- ORM: Prisma 7.
- O `docker-compose.yml` cria um servico `postgres` sem publicar a porta `5432` no host.
- As credenciais devem ser fornecidas por `.env`.
- `.env.example` contem apenas valores de exemplo.
- O schema define `Role`, `User`, `StudentProfile` e `TeacherProfile`.
- `StudentProfile.userId` e `TeacherProfile.userId` sao unicos para manter relacao 1:1 com `User`.
- O seed cria o primeiro `ADMIN` usando `ADMIN_NAME`, `ADMIN_EMAIL` e `ADMIN_PASSWORD`.
- O seed nao redefine senha de admin existente por padrao. Para redefinir, e necessario definir `ADMIN_RESET_PASSWORD=true`.
- O comando de seed do Prisma 7 fica em `prisma.config.ts`, dentro de `migrations.seed`, e e executado por `npm run prisma:seed`.
- Na FASE 3 nao houve alteracao de schema. O cadastro de usuarios usa as tabelas `User`, `StudentProfile` e `TeacherProfile` ja existentes.
- Na FASE 4-6 o schema adiciona `StudentTeacherAssignment`, `Lesson`, `LessonMaterial`, `VocabularyItem`, `Homework`, `HomeworkQuestion` e `HomeworkSubmission`.
- Na FASE 9 o schema adiciona `User.isActive` e `LoginAttempt`.
- `HomeworkSubmission` tem chave unica por `homeworkId` e `studentProfileId`, evitando duplicidade de resposta por aluno/homework.
- Homework corrigida nao pode ser reenviada pelo aluno nesta fase, preservando o feedback ja enviado.
- Indices foram adicionados em campos de busca por teacher, student, status e relacionamentos principais.
- `AppSetting` guarda configuracoes operacionais simples, como modo manutencao.
- `ChatThread` representa a conversa privada de um vinculo teacher-aluno.
- `ChatMessage` guarda mensagens do chatbox com `senderUserId`, sempre validado por role e vinculo antes da escrita.

### Docker

- `Dockerfile` usa build multi-stage com Node 24 slim.
- `next.config.ts` usa `output: "standalone"` para a imagem final do app.
- O target `tools` do Dockerfile permite executar Prisma CLI, seed e smoke test sem inflar o container principal em tempo de execucao.
- `docker-compose.yml` contem `app`, `postgres` e servicos utilitarios `migrate`, `seed` e `audit-server-smoke`.
- Os servicos utilitarios usam o perfil `tools` e devem ser executados sob demanda.
- O servico `seed` pode ser chamado diretamente com `docker compose run --rm seed`; o Compose ativa o servico solicitado mesmo ele estando no perfil `tools`.
- O app publica a porta `3000` apenas no host definido por `APP_HOST_BIND`, com padrao `127.0.0.1`.
- O runtime do Next.js no container define `HOSTNAME=0.0.0.0`, permitindo healthcheck interno em `127.0.0.1:3000` e acesso pelo servico `app` na rede Docker.
- Logs de `app` e `postgres` usam driver `json-file` com `max-size=10m` e `max-file=3`.
- `app`, `postgres` e ferramentas possuem `mem_reservation` e `mem_limit` para manter o runtime proximo da meta de 10% de 24 GB.
- O PostgreSQL usa parametros conservadores: `shared_buffers=256MB`, `work_mem=8MB`, `maintenance_work_mem=128MB`, `effective_cache_size=768MB` e `max_connections=50`, todos ajustaveis pelo `.env`.

### Operacao

- `/api/health` e usado pelo healthcheck do container e pode ser validado pelo proxy/operador.
- `scripts/server-smoke.ts` valida carregamento do site, tela de login e redirecionamento de area protegida sem sessao.
- `npm run verify:server-smoke` executa o smoke test via Docker Compose usando o perfil `tools`.
- `docs/producao-checklist.md` registra o fluxo recomendado de deploy com e sem migration.

## Pendencias Tecnicas Planejadas

Itens identificados como proximos endurecimentos, mas ainda fora desta entrega:

- throttling mais forte por IP ou servico dedicado;
- revogacao imediata de sessoes JWT apos mudanca de role;
- rotina formal de backup e restore do PostgreSQL;
- normalizacao case-insensitive mais forte para email;
- menus responsivos mais completos para areas do site e do AVA;
- edicao completa de usuarios e reset de senha pela interface admin;
- remocao visual de vinculos aluno-teacher.
- telas de edicao/delecao de aulas, materiais e homeworks;
- multiplas perguntas por homework na interface.

## Fora do Escopo da FASE 10

- Jogos
- Recursos de IA
- Correcao avancada de homework com notas, rubricas e relatorios
- Upload de arquivos
- MinIO
- Pagamentos
- Dashboards complexos

## FASE 11

A decima primeira fase estrutura o AVA como produto operacional:

- layout `/ava` usa sidebar por role;
- menu muda para admin, teacher e student;
- sidebar passa a funcionar como indice operacional, com grupos expansíveis por role e atalhos profundos para as secoes de cada area;
- protecao real continua nas paginas e server actions;
- o objetivo e facilitar uso diario sem criar dashboard pesado.

## FASE 12

A decima segunda fase adiciona recursos escolares de base:

- `LiveSession` guarda aula ao vivo por Google Meet;
- teacher/admin pode abrir e encerrar aula ao vivo;
- student ve botao de Meet apenas quando ha sessao ativa para ele ou geral;
- `ContractDocument` guarda metadados de contratos PDF;
- arquivos ficam fora do Git, em `storage/` local ou volume Docker `app-storage`;
- rotas `/ava/contracts/[contractId]` e `/ava/avatar/[userId]` validam sessao antes de servir arquivo;
- `User` passa a ter telefone, endereco e foto;
- login com Google e opcional e so aceita email ja cadastrado no AVA.

## FASE 13

A decima terceira fase adicionou e depois revisou movimento e experiencia visual:

- favicon usa a marca Candy English;
- Catty fica no canto inferior direito como chatbot visual;
- video global, balas e GIFs decorativos foram removidos para reduzir ruido visual e consumo de recursos;
- animacoes restantes respeitam `prefers-reduced-motion`.

## FASE 14

A decima quarta fase define orcamento de memoria no Docker:

- `app` reserva `512m` e limita em `1536m`;
- `postgres` reserva `512m` e limita em `768m`;
- `postgres` recebe `shm_size=128mb` e parametros internos coerentes com um banco pequeno/medio;
- `migrate`, `seed` e `audit-server-smoke` limitam memoria porque sao ferramentas transitorias;
- a porta `5432` continua sem publicacao no host.
- o layout do AVA foi refinado para reduzir confusao: admin, teacher e student exibem grupos expansíveis na sidebar para os principais blocos de leitura/edicao, sem caixa interna de rolagem nos atalhos.

## FASE 15

A decima quinta fase organiza o admin por tarefa dentro da mesma rota:

- `/ava/admin?task=usuarios` e a entrada padrao do admin;
- os links da sidebar usam `?task=` em vez de ancora para renderizar somente uma area principal por vez;
- criar admin, criar teacher e criar aluno usam o mesmo server action `createAvaUser`, mas a UI fixa o role de cada formulario;
- o cadastro de aluno coleta data de nascimento e calcula idade na interface, evitando gravar idade fixa no banco;
- o campo documento/responsavel passa a ter campo proprio no `StudentProfile`;
- vincular aluno continua usando server action protegida por `ADMIN`;
- o antigo espaco de editar site passa a ser reservado para manutencao operacional.

## FASE 16

A decima sexta fase amplia operacao escolar e manutencao:

- `StudentProfile` passa a guardar `guardianDocument`, `studentPhone`, `studentPhoneAlt`, `motherName` e `motherPhone`;
- `AppSetting` guarda o modo manutencao;
- login por credentials e Google rejeita `STUDENT` quando manutencao esta ativa;
- `/ava/student` mostra uma tela de "Manutencao Candy" para student que ja tinha sessao;
- `ADMIN` e `TEACHER` continuam acessando o AVA durante manutencao;
- `ChatThread` e `ChatMessage` criam uma chatbox teacher/aluno dentro do AVA;
- mensagens so podem ser criadas quando existe `StudentTeacherAssignment`;
- teacher e student passam a usar `?task=` para renderizar uma tarefa principal por vez;
- o site/login recebe botao de WhatsApp para contato comercial;
- navegacao institucional ganha textos maiores para melhorar leitura.

## Decisao Sobre Aula Ao Vivo

O projeto usa Google Meet nesta fase. Isso entrega camera, microfone e compartilhamento de tela com seguranca e estabilidade sem criar uma infraestrutura WebRTC propria. A aula nao fica embutida como player interno; o AVA mostra o botao protegido e abre o Meet para usuarios autorizados.

## Decisao Sobre Uploads

Uploads agora existem apenas para foto de perfil e contratos PDF. Eles usam validacao de tipo e tamanho no servidor. Nao ha upload livre de materiais ainda. Em producao, o volume Docker `app-storage` preserva os arquivos entre recriacoes do container.

## FASE 17

A decima setima fase refina leitura visual e auditoria basica de usuarios:

- a listagem de usuarios do admin passa de tabela unica para tres colunas por role: admin, teacher e aluno;
- o historico exibido no admin e derivado de dados existentes no banco, sem nova tabela nesta fase;
- teacher mostra contadores de alunos vinculados, aulas, homeworks, feedbacks, aulas ao vivo, chats e contratos enviados;
- aluno mostra contadores de teachers vinculados, aulas recebidas, respostas enviadas, contratos, aulas ao vivo e chats;
- o resumo do usuario logado foi reduzido para um card compacto, evitando overflow visual;
- textos explicativos redundantes foram removidos dos paineis operacionais;
- o favicon usa a bala SVG transparente em `public/favicon.svg`;
- a home removeu o elemento decorativo solto sobre o mockup e o footer deixou de usar logo dentro de card branco.

## FASE 18

A decima oitava fase altera apenas a experiencia visual da home:

- `HomeHero` usa um `<video>` remoto fullscreen como plano principal;
- `SiteHeader` virou client component para detectar a rota atual com `usePathname`;
- na rota `/`, o header fica fixo sobre o hero com efeito `liquid-glass`;
- nas demais rotas, o header continua sticky com fundo claro, preservando leitura;
- fontes Inter e Instrument Serif sao carregadas via Google Fonts no CSS global;
- o AVA, autenticacao, Prisma e regras de permissao nao foram alterados.
