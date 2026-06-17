# Estatisticas de palpites finalizados

## Objetivo

Corrigir as issues #13 e #14 para que as estatisticas de desempenho considerem
somente partidas finalizadas. Palpites de jogos abertos, bloqueados ou futuros
nao devem reduzir a taxa de acerto nem aumentar a contagem de erros.

## Regra de negocio

Para cada palpite associado a uma partida com status `FINISHED`:

- `3` pontos representa um placar exato.
- `1` ponto representa um acerto parcial do vencedor ou empate.
- `0` pontos representa um erro.

A taxa de acerto sera calculada por:

```text
(placares exatos + acertos parciais) / palpites finalizados * 100
```

O resultado sera arredondado para o inteiro mais proximo, mantendo o
comportamento atual. Quando nao houver palpites finalizados, a taxa sera `0`.

O campo `totalGuesses` continuara representando todos os palpites realizados.
Somente `errors` e `hitRate` passam a usar o subconjunto de partidas
finalizadas. Os campos `exactScores` e `partialScores` permanecem equivalentes
aos palpites pontuados, pois partidas nao finalizadas ainda possuem zero pontos.

## Desenho tecnico

Sera criada uma funcao pura compartilhada no modulo de pontuacao para receber
palpites contendo `points` e `match.status`. Ela retornara:

- quantidade de palpites finalizados;
- quantidade de placares exatos;
- quantidade de acertos parciais;
- quantidade de erros;
- taxa de acerto.

O perfil e o ranking utilizarao essa mesma funcao para evitar divergencia entre
as telas. Os repositorios de usuarios e ranking selecionarao tambem o status da
partida associado a cada palpite.

## Arquivos afetados

- `src/shared/scoring/scoring.ts`
- `src/modules/users/services/users.service.ts`
- `src/modules/users/repositories/users.repository.ts`
- `src/modules/ranking/repositories/ranking.repository.ts`
- arquivos de teste e configuracao minima necessarios para executa-los

Nao serao alteradas regras de pontuacao, desempate, ordenacao do ranking,
estrutura do banco ou componentes do frontend.

## Testes

Os testes serao escritos antes da implementacao e cobrirao:

1. nenhum jogo finalizado retorna zero erros e taxa zero;
2. jogos nao finalizados sao ignorados nas estatisticas avaliadas;
3. placares exatos e acertos parciais entram na taxa de acerto;
4. palpites zerados de partidas finalizadas entram como erros;
5. mistura de partidas finalizadas e nao finalizadas produz valores corretos;
6. o ranking conserva a ordenacao e usa a mesma contagem de erros.

Sera usada a infraestrutura minima compativel com o projeto, sem adicionar uma
biblioteca de testes quando o executor nativo do Node for suficiente.
