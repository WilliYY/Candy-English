# 99 - Contexto Rapido para Codex

## Para que serve

Este documento existe para reduzir o prompt necessario ao continuar o projeto Candy English em outro chat. Ele nao substitui `AGENTS.md`, `README.md` nem os docs oficiais; ele aponta o caminho rapido e registra o estado operacional recente.

## Prompt minimo para novo chat

Use este prompt e complete apenas o pedido:

```text
Estou no projeto Candy English em C:\Projetos\candy-english.
Leia AGENTS.md, README.md e docs/99-contexto-rapido-codex.md.
Depois execute meu pedido seguindo os padroes do projeto: [meu pedido aqui]
```

## Roteiro automatico esperado

Ao receber o prompt minimo, o agente deve:

1. Ler `AGENTS.md`, `README.md` e este arquivo.
2. Ler os docs especificos do modulo antes de alterar arquivos.
3. Usar `rg` para localizar codigo e referencias.
4. Fazer mudancas pequenas, rastreaveis e reversiveis.
5. Atualizar documentacao quando houver mudanca de fluxo, regra, permissao, layout importante, banco, deploy ou integracao.
6. Rodar validacoes proporcionais ao risco.
7. Fazer commit e push quando a implementacao estiver concluida, salvo pedido contrario.
8. Fazer pull/deploy Oracle por conta propria quando a mudanca precisar ir para producao e houver acesso operacional.
9. Se nao houver SSH, chave, sessao remota ou permissao para acessar o Oracle, informar o bloqueio exato e deixar os comandos PuTTY de deploy.
10. Finalizar em portugues com arquivos alterados, docs, comandos, validacoes, pendencias, riscos, commit/push e deploy.

## Estado atual resumido

- Site institucional e AVA proprio em `/ava`.
- Roles atuais: `ADMIN`, `TEACHER` e `STUDENT`.
- Login Google esta desativado por enquanto; o AVA usa email/senha pelo Credentials Provider.
- Login do AVA tem pre-cadastro publico `Quero ser aluno Candy`; ele grava `StudentPreRegistration.PENDING` e nunca cria usuario, senha ou sessao automaticamente.
- Admin gerencia usuarios, aceita/recusa pre-cadastros, redefinicao de senha, vinculos, contratos, financeiro, agenda, manutencao e cofre de APIs/senhas.
- Teacher cria aulas, homework interativo, materiais, feedback, mensagens, contratos, ve a aula ao vivo em manutencao temporaria e pode aceitar pre-cadastros pendentes/em analise como alunos `STUDENT` vinculados a sua teacher.
- Student acessa aulas, homework, mensagens, contratos, perfil, avatar e ve a aula ao vivo em manutencao temporaria.
- Admin, teacher e student veem Candy XP persistente nos seus paineis: nivel, barra amarela, fontes de XP, trilha infinita, streak, badges, ultimos eventos, roadmap e slot visual para jogos/missoes futuras.
- Candy XP usa `src/lib/candy-xp.ts` para curva infinita e `src/lib/candy-xp-persistence.ts` para eventos `CandyXpEvent`, perfil/cache `CandyXpProfile`, badges e catalogo inicial de missoes com `sourceKey` anti-duplicacao.
- Atividades Candy XP existem em `/ava/admin?task=candy-xp` e `/ava/student?task=candy-xp`: admin cria missao com PDF/imagem do Canva, liberacao e XP sem perguntas novas obrigatorias; student envia a missao e pode ganhar XP automaticamente, mantendo compatibilidade com atividades antigas que tinham perguntas.
- Arquivos de atividades Candy XP sao servidos por `/ava/candy-xp-assets/[activityId]` com permissao por role/publicacao/assignment.
- Upload de PDF do Candy XP, homework interativo e aula interativa tenta otimizar com Ghostscript no servidor via `src/lib/file-optimization.ts`; se falhar, salva o original.
- Homework e aula interativa usam PDF/imagem original como fundo protegido.
- Teacher desenha campos manualmente sobre o arquivo.
- Campos de texto do aluno mostram guias discretas com `texto` em cada linha para indicar onde escrever; a ferramenta `Letra/Num` cria `TINY_TEXT` para V/F, A/B/C/D ou numero curto com caixa centralizada de ate 2 caracteres; a ferramenta `Listening` cria `LISTENING`, uma area sobre o texto/frases com botao de volume no fim direito, tenta ler automaticamente a camada de texto do PDF localmente com cache por pagina e depois um recorte melhorado com retry via Gemini/fallback do arquivo antes de salvar, permite ajuste manual em campo estavel e toca audio OpenAI text-to-speech em voz feminina/animada alternando normal/devagar; campos de marcar/desenho continuam aparecendo apenas como a marca ou os tracos preenchidos.
- Campo de desenho funciona com mouse/dedo e permite desfazer o ultimo traco.
- Atividades criadas por `Criar/Ver Aulas` aparecem em `Aulas e Materiais`.
- Atividades criadas por `Criar/Ver Homework` aparecem em `Responder homework`.
- Corrigir homework mostra o PDF com a entrega marcada e separa `Aguardando correcao` de `Corrigidos`.
- Itens de correcao ficam minimizados por padrao.
- Contratos PDF sao visualizados no AVA por rota protegida.
- Catty so responde para usuario logado no AVA; `/api/catty/chat` exige `auth()` com role `ADMIN`, `TEACHER` ou `STUDENT`, detecta uma intencao leve da mensagem antes de chamar IA/fallback, incluindo correcao, traducao, explicacao de palavra, conversacao, homework, Candy XP, aula/material, mensagem para teacher, criacao de atividade para teacher, feedback para aluno, motivacao, duvida do AVA, codigo/API, pergunta fora do tema, pedido de resposta pronta, pergunta confusa ou pergunta grande misturada, usa historico persistido/local recente limitado para contexto de IA, mas retencao no banco pode chegar a 50.000 mensagens por usuario/contexto para acompanhar anos de estudo, adiciona contexto seguro derivado no servidor com role, primeiro nome e nivel do aluno quando existir, pode usar esse primeiro nome em respostas seguras sem repetir toda hora, nunca em tema sensivel, adiciona ate 3 itens aprovados do Catty Learning Center priorizados por intencao/tags/texto quando relevantes, adiciona ate 5 memorias pessoais `CattyUserMemory.ACTIVE` do proprio usuario priorizadas por intencao/texto/uso/recencia, com no maximo 2 dificuldades e 2 interesses/temas por contexto, pode sugerir um artefato de personalidade padrao ou customizado em `src/lib/catty-artifacts.ts`/`CattyUserArtifact` com base no interesse seguro do aluno e variar som/emoji/bordao/exemplo pelo historico recente, retorna `messageId` para permitir feedback discreto da resposta, usa Gemini quando configurado, OpenAI apenas quando a mensagem chama Catty pelo nome (`Catty`, `catty` ou `/catty`), fallback local autorizado quando nao ha chave, a chamada falha ou a resposta da IA vem vazia/cortada/generica/insegura/fora do escopo Candy, e mantem personalidade oficial centralizada em `src/lib/catty-personality.ts`.
- Catty Learning Center fica em `/ava/admin?task=catty-learning` e `/ava/teacher?task=catty-learning`: `STUDENT` pode enviar feedback discreto da propria resposta da Catty, `TEACHER` revisa feedback proprio ou de alunos vinculados e pode sugerir aprendizado pendente, `ADMIN` aprova globalmente; apenas `CattyLearningItem.status=APPROVED` entra no prompt/fallback, e a validacao recusa senha, pagamento, contrato, telefone, documento, email, token, chave ou dados privados.
- Catty User Memory fica em `CattyUserMemory`/`CattyMemoryEvent`: memorias pessoais sao separadas por `User.id`, podem guardar interesses, temas favoritos, dificuldades, objetivo ou estilo de explicacao, mas nunca senha, pagamento, contrato, documento, telefone, endereco, email, token ou chave; `TEACHER` so acessa aluno vinculado e a rota de resposta sempre filtra pelo usuario logado. Quando uma mensagem contradiz uma memoria ativa, a helper marca como `FLAGGED` e registra evento, sem apagar automaticamente. Quando o usuario pede para parar de usar um tema, a helper cria memoria de estilo `avoid_*` para bloquear aquele artefato. Admin/Teacher usam a entrada simples `Catty dos alunos` para ver resumo de memoria ativa do aluno selecionado; Student ve apenas `Catty aprendendo`.
- Catty User Artifacts fica em `CattyUserArtifact` e na tarefa `Catty dos alunos` apenas para Admin/Teacher: Admin gerencia todos e Teacher alunos vinculados. Student nao ve a tela nem altera artefatos por action. O fluxo principal e aluno -> gosto -> gerar emojis/sons/bordoes -> salvar gosto ativo. Campos principais: `themeId`, `label`, `emojis`, `catchphrases`, `sounds`, `example`, `toneRule`, `status`, `isPrimary`, `lastUsedAt` e `usageCount`. Somente `ACTIVE` entra no prompt/fallback e nos baloes locais do AVA logado daquele usuario; `PENDING`, `DISABLED` e `ARCHIVED` ficam fora. `isPrimary=true` prioriza levemente um gosto ativo quando ele combina naturalmente. Ativar sincroniza memoria `FAVORITE_THEME/artifact_*`; desativar sincroniza `STYLE/avoid_*`. Admin/Teacher tambem podem pedir enriquecimento de tema, que usa `CattyArtifactEnrichmentCache`/`CattyArtifactEnrichment` para criar sugestoes cacheadas e revisaveis; busca web e opcional por `CATTY_ARTIFACT_SEARCH_PROVIDER=brave` + `BRAVE_SEARCH_API_KEY`, nunca roda no chat normal, e so ativa depois de aprovacao/edicao humana.
- Ao criar aluno direto pelo Admin ou aceitar pre-cadastro por Admin/Teacher, existe um campo minimizado `Contexto Catty`; quando preenchido, ele grava `CattyUserMemory.NOTE/contexto_catty` ativa para dar contexto pedagogico inicial a Catty, usando a mesma validacao contra dados sensiveis.
- Catty pode criar `PATTERN_SUGGESTION` pendente quando usa fallback sem memoria relevante, encontra pergunta confusa/fora do trilho sem memoria aprovada ou acumula feedbacks negativos recentes; isso aparece na fila de treino, mas nao vira comportamento oficial sem aprovacao.
- Catty tem banco de exemplos em `src/lib/catty-examples.ts`, repertorio ampliado em `src/lib/catty-scenarios.ts`, guia em `docs/catty-comportamento.md` e smoke `npm run audit:catty-behavior` para validar tom, intencoes, fallback, redirecionamento de codigo/API/off-topic, bloqueio de resposta pronta, no maximo um bordao por resposta, ate dois emojis permitidos, personalizacao segura por nome, memoria global aprovada, memoria pessoal segura, artefatos padrao/customizados por interesse, enriquecimento revisavel/cacheado de artefatos, anti-repeticao por historico recente, 52 cenarios curados, checklist de 20 fallbacks por cenario, 20 interacoes de pergunta/correcao/fragmento, pelo menos 40 correcoes comuns, 6 conversas continuas e gatilho OpenAI apenas por `Catty`.
- O repertorio `catty-scenarios` tem nome, intencao, entrada do usuario, contexto opcional, memoria opcional, resposta ruim, resposta ideal, regra e tags; a rota indexa cenarios por intencao, seleciona ate 4 por intencao/contexto/mensagem/historico/memoria e inclui no prompt como `Cenarios de repertorio da Catty`, sem mandar a base inteira. Quando a IA falha e ha match forte ou entrada exata, o fallback do servidor pode usar a resposta ideal curada antes do fallback generico, preservando o fallback gramatical local quando ele ja corrige e continua melhor.
- Catty tambem tem detector local de pedido de pergunta (`faz uma pergunta`, `ask me a question`, `simple past`, carros/comida) e correcao conversacional para erros comuns de ingles: present simple, `do/does`, `to be`, idade, simple past, `was/were`, futuro com `will`, `there is/are`, artigos, plural, preposicoes, ordem de palavras, `like/would like/want`, `can` e possessivos. Quando a frase ja foi enviada, ela responde com reacao curta, `Melhor: ...`, onde esta o erro e pergunta relacionada; em homework, usa como estrutura parecida sem entregar gabarito. A continuidade multi-turno usa historico curto para juntar gostos com `and` e completar fragmentos seguros, como `chocolate` -> `I like chocolate.` e `red cars` -> `I like red cars.`.
- Catty recebe do `RootLayout` apenas o nome da sessao e os artefatos `ACTIVE` do proprio usuario para baloes visuais locais no AVA logado; o widget usa primeiro nome, mistura gosto aprovado com frases Candy genericas, troca fala a cada 10 segundos, evita repetir a frase atual e nao chama IA para esses baloes. Para visitante sem login no site/login, a Catty e mascote publica com baloes aleatorios a cada 10 segundos e clique bloqueado por aviso pequeno, sem abrir chat real nem chamar API.
- Header do site usa destaque forte no item de navegacao ativo.
- Home atual usa `public/brand/home-candy-2.mp4` como fundo do primeiro card dominante do hero em loop mudo, com palco menos horizontal, zoom leve e fundo branco reduzido quando sobra area.
- No hero da home, `intro-1.mp4` e `intro-2.mp4` ficam embutidos dentro desse mesmo primeiro card, no espaco livre do fundo, com borda suave, autoplay mudo, loop, fundo branco para evitar cortes e botoes visiveis para pausar/retomar e ligar/desligar som.
- O componente `src/components/site/home-hero-loop-video.tsx` garante autoplay mudo do video principal; `src/components/site/home-video-card.tsx` controla play/pause e som dos cards de intro.

## Docs mais usados por tipo de tarefa

- Arquitetura ou rotas: `docs/01-arquitetura.md`
- Banco, Prisma ou migration: `docs/02-banco-de-dados.md`
- Fluxos do AVA: `docs/03-fluxos-do-sistema.md`
- Padroes de codigo: `docs/04-padroes-de-codigo.md`
- Comandos, validacao e deploy: `docs/05-comandos.md`
- Pendencias conhecidas: `docs/06-pendencias.md`
- Decisoes tecnicas: `docs/07-historico-de-decisoes.md`
- Auth e permissoes: `docs/08-autenticacao-e-permissoes.md`
- Deploy/ambiente: `docs/09-deploy-e-ambiente.md`
- Financeiro: `docs/13-financeiro.md`
- Agenda: `docs/14-agenda.md`
- Homework/aula interativa: `docs/15-homework-interativo.md`
- Candy XP/gamificacao: `docs/16-candy-xp.md`
- Atividades Candy XP: `docs/17-candy-xp-atividades.md`
- Direcao visual: `docs/design-direcao.md`

## Comandos locais preferidos

No Windows, prefira `npm.cmd` para evitar bloqueio de PowerShell:

```powershell
npm.cmd run prisma:validate
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
npm.cmd run audit:catty-behavior
```

## Deploy Oracle

O projeto oficial no servidor fica em:

```bash
/home/ubuntu/projetos/candy-english
```

Deploy sem migration:

```bash
cd /home/ubuntu/projetos/candy-english
git pull
docker compose build app audit-server-smoke
docker compose up -d --force-recreate app
sleep 45
docker compose ps
docker compose --profile tools run --rm audit-server-smoke
docker compose --profile tools run --rm audit-server-smoke npm run audit:auth-smoke
docker compose --profile tools run --rm audit-server-smoke npm run audit:avatar-smoke
```

Deploy com migration:

```bash
cd /home/ubuntu/projetos/candy-english
git pull
docker compose up -d postgres
docker compose build app migrate audit-server-smoke
docker compose --profile tools run --rm migrate
docker compose up -d --force-recreate app
sleep 45
docker compose ps
docker compose --profile tools run --rm audit-server-smoke
docker compose --profile tools run --rm audit-server-smoke npm run audit:auth-smoke
docker compose --profile tools run --rm audit-server-smoke npm run audit:avatar-smoke
```

## Cuidados permanentes

- Nunca expor segredos, `.env`, chaves, senhas ou valores revelados do cofre admin.
- Nunca versionar uploads, backups ou arquivos reais de ambiente.
- Nunca abrir PostgreSQL publicamente.
- Nunca reverter mudancas do usuario sem permissao explicita.
- Mudancas sensiveis devem validar `auth()`, role e permissao por dado no servidor.
- `STUDENT` acessa apenas o proprio perfil.
- `TEACHER` atua apenas sobre proprias aulas ou alunos vinculados.
- `ADMIN` pode supervisionar tudo, mas actions sensiveis ainda devem validar role no servidor.
