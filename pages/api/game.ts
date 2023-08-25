
import { IncomingMessage, ServerResponse } from 'http';
import { Game, GameSetup, Country, gameSetups, countries, RequestAction, Query, PlayingMode, GameState } from "@/src/game.types"
import { randomChoice } from "@/src/util";
var _ = require('lodash');


var gameUserMap: {[x: string]: Game} = {}

const _winningFormations: {[x: string]: number[][][]} = {}  // saves all combinations of coords leading to a win (axes: combination, coord pair, coord)
function getWinningFormations(size: number) {
  if (size < 2) {
    return []
  }
  const sizeKey = size.toString()
  if (sizeKey in _winningFormations) {
    return _winningFormations[sizeKey]
  }
  const eachCoord = _.range(size) as number[]
  const formations = [
    ...eachCoord.map(i => eachCoord.map(j => [i, j])),  // rows
    ...eachCoord.map(j => eachCoord.map(i => [i, j])),  // columns
    eachCoord.map(i => [i, i]),  // diagonal 1
    eachCoord.map(i => [i, size - i])  // diagonal 2
  ]
  _winningFormations[sizeKey] = formations
  return formations
}


function makeGuess(game: Game, playerIndex: number, { userIdentifier, countryId, pos }: Query) {
  const match = (pos as string).match(/^(\d+),(\d+)$/)
  if (!match) {
    console.log(`Error: Invalid pos argument`);
    return false
  }
  const [i, j] = [parseInt(match[1]), parseInt(match[2])]
  if (i < 0 || i >= game.setup.size || j < 0 || j >= game.setup.size) {
    console.log(`Error: Invalid pos argument`);
    return false
  }
  const country = countries.find(c => c.iso == countryId)
  if (!country) {
    console.log(`Error: Country "${countryId}" not found!`);
    return false
  }
  if (game.marking[i][j] != -1 || game.guesses[i][j]) {
    console.log(`Error: Cell (${i},${j}) already occupied!`);
    return false
  }
  const userIndex = game.users.indexOf(userIdentifier)
  if (![0, 1].includes(userIndex)) {
    console.log(`Error: User identifier not found!`);
    return false
  }
  if (game.turn != playerIndex) {
    console.log(`Error: It's not player ${playerIndex}'s turn!`);
    return false
  }

  // check correct solution
  if (!game.isValidGuess(i, j, country)) {
    console.log(`Error: Wrong guess ((${i},${j}), ${country.name})`)
    game.turn = 1 - game.turn
    return true  // might return false?
  }

  // execute
  game.marking[i][j] = playerIndex
  game.guesses[i][j] = country.iso
  game.turn = 1 - game.turn
  console.log(`Set (${i},${j}) to ${country.iso} (player ${playerIndex} / user ${userIndex} / ${userIdentifier})`);

  return true

}

function endTurn(game: Game, playerIndex: number, query: Query) {
  if (game.turn != playerIndex) {
    console.log(`Error: It's not player ${playerIndex}'s turn!`);
    return false
  }
  game.turn = 1 - game.turn
  return true
}

/**
 * Checks if there is a winner. If there is a (unique) winner, set winner and winCoords on the game instance.
 * @param game Game instance
 * @returns The winner (0, 1), or null
 */
function checkWinner(game: Game) {
  const winningFormations = getWinningFormations(game.setup.size)
  const playerIndices = [0, 1]
  const wins = winningFormations.filter(formation => playerIndices.some(
    playerIndex => formation.every(([i, j]) => game.marking[i][j] == playerIndex)
  ))
  if (wins.length > 0) {
    const winners = [...new Set(wins.map(win => game.marking[win[0][0]][win[0][1]]))]
    if (winners.length == 1) {
      // Assume recent winner
      game.winner = winners[0]
      game.winCoords = wins[0]
      return winners[0]
    }
    // Multiple winners can happen if after a win the players decide to continue playing
    // If this happens, this function should not be called though
    return null
  }
  // No winner. Check draw
  if (
    game.marking.flat(1).every(player => player != -1) ||  // board is full
    winningFormations.every(formation => playerIndices.every(  // all wins blocked
      playerIndex => formation.some(([i, j]) => game.marking[i][j] == playerIndex)
    ))
  ) {
    game.winner = -1
    return -1
  }
  return null
}


function chooseGame(gameSetups: GameSetup[], filter: ((gs: GameSetup) => boolean) | null = null): GameSetup {
  if (filter) {
    gameSetups = gameSetups.filter(filter)
  }
  console.log(`Choose game setup (out of ${gameSetups.length})`);
  return randomChoice(gameSetups)
}

type Request = IncomingMessage & { query: Query };

export default (req: Request, res: ServerResponse<Request> ) => {

  const { userIdentifier, action, player, countryId, pos }: Query = req.query
  
  // --- Load / Initialize the game ------------------------------------------------
  // get the Game instance, or create a new one
  let game = _.get(gameUserMap, userIdentifier, null) as Game | null
  console.log(`userIdentifier ${userIdentifier}: ` + (game ? "Found game." : "No game found.") + " All games: " + JSON.stringify(Object.entries(gameUserMap).map(([k, v]) => k)))

  const newGame = !game || action == RequestAction.NewGame
  if (newGame) {
    game = new Game(
      chooseGame(gameSetups, setup => {
        const labels = setup.labels.rows.concat(setup.labels.cols)
        return labels.includes("Island Nation") || labels.includes("Landlocked")
      }),
      [userIdentifier],  // 1 element for offline game, 2 for online
      PlayingMode.Offline
    )

    // test win notify
    // _.range(2).forEach((i: number) => _.range(2).forEach((j: number) => {
    //   (game as Game).guesses[i][j] = randomChoice(countries).iso;
    //   (game as Game).marking[i][j] = Math.abs(i - j)
    // }));

    gameUserMap[userIdentifier] = game
  }
  game = game as Game

  // --- Action / Response ------------------------------------------------
  // actions
  let result = false

  // from now on, need a playerIndex
  let playerIndex = player !== undefined ? Number(player) : undefined
  if (playerIndex !== 0 && playerIndex !== 1) {
    playerIndex = undefined
  }

  if (action == RequestAction.ExistingOrNewGame || action == RequestAction.NewGame) {
    // Just load / initialize game
    result = !!game

  } else if (game.state != GameState.Finished && playerIndex !== undefined) {
    // in-game actions: Need unfinished game and a playerIndex

    if (action == RequestAction.MakeGuess && playerIndex !== undefined && countryId && pos) {
      result = makeGuess(game, playerIndex, req.query)

      // Check winner, if not already decided
      if (game.state != GameState.Decided) {
        const winner = checkWinner(game)
        if (winner !== null) {
          console.log(`WINNER: Player ${winner}`)
          game.state = GameState.Decided
        }
      }
      if (game.marking.flat(1).every(m => m != -1)) {
        game.state = GameState.Finished
      }

    }
    
    if (action == RequestAction.EndTurn && playerIndex !== undefined) {
      result = endTurn(game, playerIndex, req.query)
    }

  }

  console.log(`${RequestAction[action]}: ${result ? "successful" : "not successful"}`)


  res.statusCode = 200
  res.end(JSON.stringify({ isNewGame: newGame, game: game }))

};

