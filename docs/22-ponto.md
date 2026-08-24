# Ponto

## Objetivo

O modulo `Ponto` registra a jornada interna de usuarios autorizados no AVA. Ele
aceita quantas entradas e saidas forem necessarias no mesmo dia, incluindo
intervalos, com justificativa opcional em cada batida.

## Acesso

- `ADMIN` sempre acessa a area de gestao.
- Um `ADMIN` habilita um usuario ativo com role `ADMIN` ou `TEACHER` para bater
  ponto.
- Um `TEACHER` sem perfil de ponto ativo nao ve o atalho e nao acessa a rota.
- A inclusao de pessoa reutiliza um usuario existente para manter login,
  identidade e historico consistentes.
- O usuario autorizado ve somente as proprias batidas.
- O `ADMIN` ve todos os perfis, adiciona batidas manuais, corrige registros e
  ativa ou desativa o acesso.

## Regras de negocio

1. A primeira batida esperada e `ENTRY`; depois o sistema alterna entre
   `ENTRY` e `EXIT` sem limitar a quantidade diaria.
2. A batida feita pelo proprio usuario usa o horario do servidor.
3. O envio possui `operationId` unico para impedir duplicacao por clique duplo,
   repeticao de rede ou recarregamento.
4. O perfil e bloqueado na transacao antes de validar a proxima batida.
5. Correcao administrativa exige motivo e usa controle otimista por
   `updatedAt`.
6. Antes da correcao, os valores anteriores sao copiados para
   `TimeClockEntryRevision`; o historico nao e apagado.
7. Desativar uma pessoa bloqueia novas batidas e preserva todo o historico.
8. Horarios, filtros mensais e totais usam `America/Sao_Paulo`.
9. Uma entrada sem saida permanece como periodo em aberto e nao entra no total
   concluido.

## Dados

- `TimeClockProfile`: liga um usuario ao modulo e controla se pode bater ponto.
- `TimeClockEntry`: batida de entrada/saida, horario, justificativa, origem e
  autor do registro.
- `TimeClockEntryRevision`: snapshot imutavel da batida antes de cada correcao
  administrativa.

## Fluxos

### Usuario autorizado

1. Abre `/ava/ponto`.
2. Confere a proxima acao esperada e, se desejar, escreve a justificativa.
3. Registra a batida.
4. Consulta as batidas e o total do mes.
5. Baixa o proprio espelho mensal em PDF.

### Admin

1. Abre `/ava/ponto` e seleciona `Pessoas` para habilitar um usuario existente.
2. Seleciona uma pessoa e um mes para consultar o espelho.
3. Pode adicionar uma batida manual ou corrigir horario, tipo e justificativa.
4. Toda correcao pede um motivo e preserva a versao anterior.
5. Baixa o espelho mensal da pessoa selecionada em PDF.

## PDF

O relatorio e gerado no servidor por rota autenticada. `ADMIN` pode baixar
qualquer perfil; outro usuario somente o proprio. A resposta usa
`Cache-Control: private, no-store`, `Content-Disposition: attachment` e nao
grava copia no disco do servidor.

Para a geracao foi escolhido `pdfkit@0.19.1`, fixado no lockfile, por ser uma
biblioteca MIT ativa, adequada a documentos multipagina no Node 24. A versao
`0.20.1`, publicada no mesmo dia da avaliacao, nao foi adotada imediatamente.
`pdf-lib@1.17.1` foi avaliada como alternativa, mas seu pacote no registro nao e
atualizado desde 2022 e exige mais logica manual para paginacao de tabelas.

## Criterios de aceite

- Professor sem permissao nao ve nem acessa o Ponto.
- Professor habilitado registra varias entradas e saidas no mesmo dia.
- Clique repetido com o mesmo `operationId` nao duplica a batida.
- Admin habilita/desabilita pessoa, adiciona batida e corrige horario.
- Correcao cria revisao com os dados anteriores.
- Relatorio mensal soma somente pares concluidos e sinaliza periodo aberto.
- PDF abre, possui cabecalho `%PDF-` e e protegido por autorizacao server-side.
- Prisma validate, testes, typecheck, lint e build passam.
