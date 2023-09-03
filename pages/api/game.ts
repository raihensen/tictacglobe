
import { IncomingMessage, ServerResponse } from 'http';
import { Game, GameSetup, Country, countries, RequestAction, Query, PlayingMode, GameState, Language } from "@/src/game.types"
import { randomChoice } from "@/src/util";
var _ = require('lodash');
var fs = require('fs');
var path = require('path');


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


function chooseGame(
  language: Language,
  filter: ((gameSetup: GameSetup) => boolean) | null = null,
  callback: ((gameSetup: GameSetup | null) => void)
): void {

  const dir = path.join(...`data/games/${language}`.split("/"))
  console.log(`Listing game files in directory "${dir}"`)
  fs.readdir(dir, function (err: any, files: string []) {
    if (err || !files.length) {
      return callback(null)
    }
    const file = path.join(dir, _.max(files))
    console.log(`Read games from file ${file}`);
    
    fs.readFile(file, (err: any, data: string) => {
      if (err) {
        return callback(null)
      }
      let gameSetups = JSON.parse(data) as GameSetup[]
      if (filter) {
        gameSetups = gameSetups.filter(filter)
      }
      console.log(`Choose game setup (out of ${gameSetups.length})`)
      callback(randomChoice(gameSetups))
    })

  })

}

type Request = IncomingMessage & { query: Query };

function executeAndRespond(
  query: Query,
  game: Game,
  isNewGame: boolean,
  res: ServerResponse<Request>) {

  const { userIdentifier, action, player, countryId, pos, difficulty } = query

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

    if (action == RequestAction.MakeGuess && countryId && pos) {
      result = makeGuess(game, playerIndex, query)

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
    
    if (action == RequestAction.EndTurn || action == RequestAction.TimeElapsed) {
      result = endTurn(game, playerIndex, query)
    }

  }

  console.log(`${RequestAction[action]}: ${result ? "successful" : "not successful"}`)

  res.statusCode = 200
  res.end(JSON.stringify({ isNewGame: isNewGame, game: game }))

}

function respondWithError(res: ServerResponse<Request>, err: string = "API Error") {
  res.end(JSON.stringify({ error: err }))
}

export default (req: Request, res: ServerResponse<Request> ) => {

  const { userIdentifier, action, player, countryId, pos, difficulty, language }: Query = req.query
  
  // --- Load / Initialize the game ------------------------------------------------
  // get the Game instance, or create a new one
  let game = _.get(gameUserMap, userIdentifier, null) as Game | null
  console.log(`userIdentifier ${userIdentifier}: ` + (game ? "Found game." : "No game found.") + " All games: " + JSON.stringify(Object.entries(gameUserMap).map(([k, v]) => k)))

  const newGame = !game || action == RequestAction.NewGame
  if (newGame || !game) {
    if (difficulty && language) {
      chooseGame(
        language,
        gameSetup => {
          return gameSetup.data.difficultyLevel == difficulty
        },
        gameSetup => {
          if (!gameSetup) {
            return respondWithError(res, "Game could not be initialized")
          }
          game = new Game(
            gameSetup,
            [userIdentifier],  // 1 element for offline game, 2 for online
            PlayingMode.Offline
          )
          gameUserMap[userIdentifier] = game
          executeAndRespond(req.query, game, newGame, res)
        }
      )
    } else {
      respondWithError(res, "Missing parameters for game selection")
    }

  } else {
    executeAndRespond(req.query, game, newGame, res)
  }

}

