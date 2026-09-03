# 23 - Privacidade e cookies

## O que esta parte do sistema faz

O site publica em `/privacidade` um aviso legivel sobre tratamento de dados pessoais, dados de menores, Catty/IA, fornecedores externos, retencao, seguranca, direitos dos titulares, cookies essenciais e armazenamento local. O link aparece no footer publico, no login, na sidebar do AVA e dentro do chat da Catty.

O canal informado ao titular e `candyenglishbr@gmail.com`, com assunto recomendado `Privacidade e dados pessoais`. A pagina identifica a Candy English como controladora operacional nos polos de Ivate e Douradina sem inventar CNPJ, razao social ou endereco que nao existem na configuracao versionada.

## Arquivos, rotas e componentes envolvidos

- `src/app/(site)/privacidade/page.tsx`: aviso publico e metadados da rota.
- `src/components/site/site-footer.tsx`: acesso publico persistente ao aviso.
- `src/app/ava/login/page.tsx`: acesso ao aviso antes do login.
- `src/components/ava/ava-workspace-shell.tsx`: acesso dentro das areas logadas.
- `src/components/site/catty-widget.tsx`: aviso contextual antes do envio de mensagens para IA.
- `src/lib/interactive-homework-draft-storage.ts`: validade e limpeza da copia local de atividades.
- `src/components/ava/sign-out-button.tsx`: limpeza das copias locais no logout comum.
- `src/components/ava/admin-mfa-panel.tsx`: mesma limpeza quando a desativacao de MFA encerra a sessao.

## Regras que precisam ser preservadas

- Cookies de autenticacao e seguranca continuam essenciais e nao dependem de consentimento opcional para funcionar.
- Nao mostrar banner `Aceitar tudo` enquanto nao houver cookie opcional de analise, publicidade ou rastreamento.
- Se um cookie opcional for adicionado, ele deve nascer desativado e a interface deve oferecer aceitar e rejeitar os nao essenciais com o mesmo destaque.
- O site nao deve afirmar que usa rastreamento, venda de dados ou pagamento online quando esses recursos nao existem.
- O aviso da Catty deve permanecer curto e visivel: nao enviar senha, documento nem dado de pagamento; mensagens podem ser processadas por Gemini ou OpenAI.
- A Catty continua limitada ao texto digitado, historico recente proprio, contexto leve autorizado e memorias seguras; dados financeiros, documentos, contratos e credenciais nao entram no contexto.
- A copia de seguranca de homework/aula/Candy XP no `localStorage` expira 7 dias apos a ultima alteracao, e e removida ao entregar, quando a atividade fica bloqueada ou ao sair do AVA.
- Limpar o rascunho local nao substitui nem apaga por si so o `DRAFT` principal salvo no servidor.
- Contador agregado, marcadores de avisos e preferencias visuais continuam sem conter respostas de atividade.
- Solicitacoes de titular podem exigir confirmacao de identidade; nao enviar dados pessoais por resposta publica, log ou documentacao.
- Prazos de contratos, registros financeiros e trabalhistas continuam sujeitos as obrigacoes aplicaveis e nao devem ser apagados apenas com base no prazo geral da conta.

## Decisoes tecnicas

- A rota e estatica e nao consulta banco, sessao ou servico externo.
- A pagina usa o layout institucional existente, com leitura em coluna, indice ancorado e cards apenas para resumos.
- O helper de rascunho recebe uma interface minima de storage, permitindo teste unitario sem navegador.
- Conteudo JSON invalido, data invalida, data futura ou copia com mais de 7 dias e descartado na leitura.
- A limpeza de logout remove somente chaves `candy:interactive-*-draft:*`; contador de visitas e preferencias nao relacionadas permanecem.

## Validacao esperada

```bash
npx tsx --test src/lib/__tests__/interactive-homework-draft-storage.test.ts
npm run typecheck
npm run lint
npm run build
```

Validar visualmente `/privacidade` em desktop e mobile, abrir o chat da Catty e conferir os links no footer, login e sidebar do AVA. Confirmar tambem que nenhum cookie opcional e criado antes de qualquer escolha.

## Riscos e evolucao

- A identificacao cadastral completa do controlador deve ser complementada quando razao social/CNPJ/endereco oficial forem definidos pelo negocio.
- Bases legais e prazos por categoria devem ser revisados por profissional brasileiro de privacidade, especialmente para menores, contratos, financeiro, equipe e transferencia internacional.
- Antes de instalar Analytics, Pixel ou outra ferramenta de marketing, implementar gerenciador real de preferencias e atualizar esta documentacao.
- Manter inventario e contratos dos operadores externos, inclusive hospedagem, Gemini, OpenAI, Jitsi e canais sociais usados pelo titular.
