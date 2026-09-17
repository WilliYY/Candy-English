# Bom-dia da Catty no grupo Interno

## Escopo aprovado — 17/09/2026

O responsável autorizou a rotina diária às 08:00, em `America/Sao_Paulo`,
as tabelas aditivas e um único envio atrasado em 17/09. Somente o grupo Interno,
conferido por identificador exato no transporte. Conversas privadas permanecem
pausadas. Esta autorização não libera cobranças, agenda ou respostas no grupo.

## Contrato e cuidados

- Texto 100% em inglês: saudação/dia da semana calculados no servidor, corpo de
  2–4 frases naturais, simples e encorajadoras, um emoji. Aberturas, temas e
  emojis usam ciclos não semanais; a IA recebe até 30 mensagens anteriores
  desta rotina para evitar repetição. Fins de semana não pressupõem aulas.
- GPT-5.4 do canal, sem alterar a Catty do AVA. No máximo duas gerações de
  320 tokens por execução, timeout de 12 segundos por chamada, `store=false`.
  Saída validada, sem URLs, dados pessoais ou acesso a ferramentas/AVA.
  Falha da IA fica registrada; não enviar fallback semanal repetitivo.
- Worker do servidor, sem depender do navegador/PC. Reserva persistente única
  por data antes da geração; revalida autorização antes do transporte. Aceite
  da API não comprova entrega/leitura. Interrupção durante envio vira incerta,
  sem retry automático. Não há promessa de exactly-once no WhatsApp externo.
- Janela diária 08:00–08:15; sem repor dias perdidos. A exceção de hoje tem
  autorização/data e validade curta próprias, mas usa a mesma chave diária.
- Ativação e pausa explícitas, exclusivas ADMIN ativo, com versão esperada,
  auditoria e histórico em `/ava/rotina`. A pausa individual não altera a
  rotina; os controles têm nomes diferentes para não sugerir pausa global.
- Grupo cifrado; conteúdo gerado sem dados pessoais cifrado por até 45 dias
  para variação e conferência. Nenhuma mensagem recebida do grupo entra na IA.
- Testes nunca enviam para contatos reais. Integração usa schema isolado,
  IA/transporte falsos e limpeza das fixtures. O envio real atrasado é uma
  ação explicitamente autorizada, somente depois das validações.

## Entrega

Em implementação. Registrar validações e publicação nesta seção antes de
considerar a rotina ativa. Regras locais testadas: fuso, mudança de ano,
janela, exceção tardia, formato, conteúdo repetido e limites de geração.
