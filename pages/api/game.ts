
import { IncomingMessage, ServerResponse } from 'http';
import { Game, GameSetup, Country, RequestAction, Query, PlayingMode, GameState, Language, parseCountry, defaultLanguage, PlayerIndex, GameSession } from "@/src/game.types"
import { randomChoice } from "@/src/util";
import { Lexend_Tera } from 'next/font/google';
var _ = require('lodash');
// import { promises as fs } from 'fs';
var fs = require('fs').promises;
import path from 'path';
import { ClientReferenceManifestPlugin } from 'next/dist/build/webpack/plugins/flight-manifest-plugin';
import { Mutex } from 'async-mutex';


var userGameMap: { [x: string]: Game } = {}


var userSessionMap: { [x: string]: GameSession } = {}
var sessionIndex = 0
var sessions: GameSession[] = []

var sessionsMutex = new Mutex()

var countryData: { [x: string]: Country[] } = {}


const _winningFormations: { [x: string]: number[][][] } = {}  // saves all combinations of coords leading to a win (axes: combination, coord pair, coord)
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


async function makeGuess(game: Game, playerIndex: PlayerIndex, { userIdentifier, countryId, pos }: Query) {
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
  const countries = await getCountryData(game.setup.language)
  if (!countries) {
    console.log(`Error: Country data not found!`);
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
    switchTurns(game)
    return true  // might return false?
  }

  // execute
  game.marking[i][j] = playerIndex
  game.guesses[i][j] = country.iso
  switchTurns(game)
  console.log(`Set (${i},${j}) to ${country.iso} (player ${playerIndex} / user ${userIndex} / ${userIdentifier})`);

  return true

}

function endTurn(game: Game, playerIndex: number, query: Query) {
  if (game.turn != playerIndex) {
    console.log(`Error: It's not player ${playerIndex}'s turn!`);
    return false
  }
  switchTurns(game)
  return true
}

function switchTurns(game: Game) {
  game.turn = 1 - game.turn as PlayerIndex
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


async function chooseGameSetup(
  language: Language,
  filter: ((gameSetup: GameSetup) => boolean) | null = null
): Promise<GameSetup | null> {

  // const allFiles = await fs.readdir("./data")
  // console.log(`all files: ${allFiles.join(", ")}`)
  
  const dir = path.join(process.cwd(), 'public', 'data', 'games', language)
  // const dir = `./data/games/${language}`
  // console.log(`Listing game files in directory "${dir}"`)
  try {
    const files = await fs.readdir(dir)
    if (!files.length) {
      return null
    }
    const file = path.join(dir, _.max(files))
    console.log(`Read games from file ${file}`);
    const data = await fs.readFile(file)
    let gameSetups = JSON.parse(data).map((props: Omit<GameSetup, "props">) => ({
      ...props,
      language: language
    })) as GameSetup[]

    if (filter) {
      gameSetups = gameSetups.filter(filter)
    }
    // console.log(`Choose game setup (out of ${gameSetups.length})`)
    const gameSetup =  randomChoice(gameSetups)
    if (!gameSetup) {
      return null
    }
    return gameSetup

  } catch (err) {
    return null
  }
}

async function getCountryData(language: Language): Promise<Country[] | null> {

  if (language.toString() in countryData) {
    return countryData[language.toString()]
  }
  const file = path.join(process.cwd(), 'public', 'data', 'countries', `countries-${language}.json`)
  console.log(`Read countries from file ${file}...`)
  try {
    const data: any = await fs.readFile(file)
    let countries = JSON.parse(data).map(parseCountry) as Country[]
    countryData[language.toString()] = countries
    return countries
  } catch (err) {
    return null
  }
}

type Request = IncomingMessage & { query: Query };

async function executeAndRespond(
  query: Query,
  game: Game,
  session: GameSession,
  isNewGame: boolean,
  addCountryData: boolean,
  res: ServerResponse<Request>) {

  const { action, player, countryId, pos, language } = query

  // --- Action / Response ------------------------------------------------
  // actions
  let result = false
  const additionalResponseData: {countries?: Country[]} = {}

  // from now on, need a playerIndex
  let playerIndex = player !== undefined ? Number(player) : undefined
  if (playerIndex !== 0 && playerIndex !== 1) {
    playerIndex = undefined
  }

  if (addCountryData) {
    // Add country data to response
    let countries: Country[] | null = null
    if (language) {
      countries = await getCountryData(language)
    }
    if (!countries) {
      return respondWithError(res, "Country data could not be read")
    }
    additionalResponseData.countries = countries
  }

  if (action == RequestAction.ExistingOrNewGame || action == RequestAction.NewGame) {

    // Just load / initialize game
    result = !!game

  } else if (game.state != GameState.Finished && playerIndex !== undefined) {

    // in-game actions: Need unfinished game and a playerIndex
    if (action == RequestAction.MakeGuess && countryId && pos) {
      result = await makeGuess(game, playerIndex, query)

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
  
  const { currentGame, previousGames, ...sessionWithoutGames } = session  // type SessionWithoutGames

  res.statusCode = 200
  res.end(JSON.stringify({
    isNewGame: isNewGame,
    game: game,
    session: sessionWithoutGames,
    ...additionalResponseData }))

}

function respondWithError(res: ServerResponse<Request>, err: string = "API Error") {
  res.end(JSON.stringify({ error: err }))
}

async function cleanCache() {
  sessionsMutex.runExclusive(() => {

    // delete sessions without users
    sessions = sessions.filter(session => session.users.length >= 1)
    Object.entries(userSessionMap).filter(([user, session]) => !sessions.includes(session)).forEach(([user, session]) => {
      delete userSessionMap[user]
    })

  })
}

const gameApi = async (req: Request, res: ServerResponse<Request>) => {

  const { userIdentifier, playingMode, action, player, difficulty, language }: Query = req.query

  cleanCache()

  // --- Load / Initialize the game ------------------------------------------------
  // get the Game instance, or create a new one
  // let game = _.get(userGameMap, userIdentifier, null) as Game | null

  await sessionsMutex.runExclusive(async () => {

    console.log()
    console.log(`Incoming request from ${userIdentifier}: ${JSON.stringify(req.query)}`)

    let session = _.get(userSessionMap, userIdentifier, null) as GameSession | null
    let game = session ? session.currentGame : null

    console.log(`userIdentifier ${userIdentifier}: ` + (session ? `Found existing session (#${session.index}).` : "No existing session."))
    console.log("All users in sessions: " +  JSON.stringify(Object.entries(userSessionMap).map(([k, v]) => k)) + " - Number of sessions: " + sessions.length)

    const newGame = !session || !game || action == RequestAction.NewGame
    const newSession = !session

    if (!newSession && !newGame && session && session.currentGame) {
      // It might still be a new game to the user (when the other one started a new game)
      const gameHasChanged = false  // TODO detect if the user had a different game before (add some ID to the query?)
      const addCountryData = action == RequestAction.ExistingOrNewGame || gameHasChanged
      console.log(`Returning existing game (${addCountryData ? "do not " : ""}add country data)`)
      await executeAndRespond(req.query, session.currentGame, session, false, addCountryData, res)
      return
    }
    if (!difficulty || !language) {
      respondWithError(res, "Missing parameters for game selection")
      return
    }


    if (newSession) {
      // Find/create a new session for the user
      if (playingMode == PlayingMode.Online) {

        // find session with free spots
        const availableSessions = sessions.filter(session => session.users.length < 2)
        // TODO TTG-31 filter for sessions with matching settings (difficulty, language)
        if (availableSessions.length) {
          session = availableSessions[0]
          session.users.push(userIdentifier)
          userSessionMap[userIdentifier] = session
          console.log(`Assigned existing session #${session.index}`)
        }
      }

      if (!session) {
        session = {
          index: sessionIndex++,
          playingMode: playingMode,
          currentGame: null,
          previousGames: [],
          users: [userIdentifier],
          score: [0, 0]
        }
        sessions.push(session)
        userSessionMap[userIdentifier] = session
        console.log(`Created a new session: ${JSON.stringify(session)}`)
      }

    }

    if (!session) {
      respondWithError(res, "Session could not be initialized")
      return
    }

    // Archive the current game to then create a new one
    if (session.currentGame) {
      session.previousGames.push(session.currentGame)
      session.currentGame = null
    }
    
    // Create new game
    const gameSetup: GameSetup | null = await chooseGameSetup(
      language,
      gameSetup => {
        return gameSetup.data.difficultyLevel == difficulty
      }
    )
    if (!gameSetup) {
      return respondWithError(res, "Game could not be initialized")
    }
    game = new Game(
      gameSetup,
      [...session.users],
      playingMode
      // TODO specify which player starts
    )
    session.currentGame = game
    // userGameMap[userIdentifier] = game

    await executeAndRespond(req.query, game, session, newGame, true, res)

  })

}

export default gameApi;

