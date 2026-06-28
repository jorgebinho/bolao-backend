# Classificado visível nos palpites dos participantes

## Objetivo

Exibir, abaixo do placar de cada participante, a seleção escolhida para avançar em jogos de mata-mata:

`Classifica: <seleção>`

## Causa

O frontend já renderiza `guess.advancingTeam`, e o backend atual já serializa o campo. Porém, palpites gravados antes da introdução dessa informação possuem `advancingTeam` nulo. Nesses registros legados, a lista mostra somente o placar.

## Solução

- Ao serializar um palpite de mata-mata, usar o `advancingTeam` persistido quando houver.
- Para um palpite legado sem valor persistido e com placar não empatado, derivar o classificado pelo vencedor indicado no placar.
- Para um empate legado sem valor persistido, manter o campo nulo, pois não há informação suficiente para descobrir a escolha do participante.
- Aplicar a mesma normalização ao `myGuess` e à coleção pública `guesses`.
- Preservar a regra de privacidade existente: os palpites dos demais participantes só são retornados quando o jogo está bloqueado ou finalizado.
- Não alterar o layout existente do frontend.

## Fluxo

1. O repositório carrega os palpites e o valor persistido de `advancingTeam`.
2. O serviço calcula o classificado efetivo para serialização.
3. O valor persistido tem prioridade.
4. Na ausência dele, um placar não empatado permite derivar o time classificado.
5. Após o bloqueio ou encerramento, o serviço expõe o valor efetivo em cada item de `guesses`.
6. O componente `MatchCard` usa a renderização existente para mostrar a segunda linha quando o campo possui valor.

## Testes

- Um palpite legado não empatado recebe o classificado derivado após o bloqueio.
- Um valor persistido tem prioridade sobre qualquer derivação.
- Um empate legado sem escolha permanece com `advancingTeam` nulo.
- O palpite do próprio usuário usa a mesma normalização.
- Antes do bloqueio, os palpites dos demais participantes continuam ocultos.

## Fora de escopo

- Adivinhar o classificado de empates legados sem escolha registrada.
- Mudanças na regra de pontuação.
- Mudanças no formulário ou no layout.
- Novo endpoint ou alteração da regra de visibilidade.
