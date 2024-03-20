
import { IncomingMessage, ServerResponse } from 'http';
import { Game, GameSetup, Country, RequestAction, Query, PlayingMode, GameState, Language, parseCountry, defaultLanguage, PlayerIndex, GameSession, DifficultyLevel, Settings, settingsFromQuery, defaultSettings } from "@/src/game.types"
import { randomChoice } from "@/src/util";
import _ from "lodash";
// import { promises as fs } from 'fs';
var fs = require('fs').promises;
import path from 'path';
import { Mutex } from 'async-mutex';

// var userSessionMap: Record<string, GameSession> = { "debug": sessions[0] }
var userSessionMap: Record<string, GameSession> = {}
var sessions: GameSession[] = []

var sessionIndex = 1
var sessionsMutex = new Mutex()
var countryData: Record<string, Country[]> = {}


const _winningFormations: Record<string, number[][][]> = {}  // saves all combinations of coords leading to a win (axes: combination, coord pair, coord)
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
    eachCoord.map(i => [i, size - i - 1])  // diagonal 2
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
    console.log(`Wrong guess ((${i},${j}), ${country.name})`)
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
  console.log(`switchTurns`)
  game.turn = 1 - game.turn as PlayerIndex
  game.turnCounter += 1
  game.turnStartTimestamp = Date.now()
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
    const file = path.join(dir, _.max(files) ?? "")
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

async function createGame(
  session: GameSession,
  difficulty: DifficultyLevel,
  language: Language
): Promise<Game | null> {

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
    return null
  }
  const game = new Game(
    gameSetup,
    [...session.users],
    session.playingMode,
    (Math.random() < .5 ? 0 : 1)  // who starts?
    // TODO logic within session to determine who starts (loser? alternating?)
  )
  game.turnStartTimestamp = Date.now()
  session.currentGame = game
  return game

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

function isIngameAction(action: RequestAction) {
  return action == RequestAction.MakeGuess || action == RequestAction.EndTurn || action == RequestAction.TimeElapsed || action == RequestAction.RefreshGame || action == RequestAction.EndGame
}
function isGameInitAction(action: RequestAction) {
  return action == RequestAction.NewGame || action == RequestAction.ExistingOrNewGame
}
function isSessionInitAction(action: RequestAction) {
  return action == RequestAction.JoinSession || action == RequestAction.InitSessionFriend || action == RequestAction.InitSessionRandom || action == RequestAction.RefreshSession || action == RequestAction.InitSessionOffline
}

type Request = IncomingMessage & { query: Query }

async function executeAndRespond(
  res: ServerResponse<Request>,
  query: Query,
  session: GameSession,
  game: Game | null,
  responseOptions: {
    addCountryData?: boolean
  }
) {

  const { action, player, countryId, pos, language } = query
  const newSettings = settingsFromQuery(query)

  const addCountryData = responseOptions.addCountryData ?? false

  // --- Apply new settings -----------------------------------------------
  if (isIngameAction(action) && !_.isEmpty(newSettings)) {
    session.settings = {...session.settings, ...newSettings}
    console.log(`Update settings: ${JSON.stringify(newSettings)}`)
    console.log(`-> New settings: ${JSON.stringify(session.settings)}`)
  }

  // --- Action / Response ------------------------------------------------
  // actions
  let result = false
  const additionalResponseData: {
    countries?: Country[],
    invitationCode?: string
  } = {}

  // TODO determine playerIndex by userIdentifier in online mode
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

  if (action == RequestAction.ExistingOrNewGame || action == RequestAction.NewGame || action == RequestAction.RefreshGame) {

    // Just load / initialize game
    result = !!game

  } else if (game && isIngameAction(action) && game.state != GameState.Finished && playerIndex !== undefined) {

    // in-game actions
    if (action == RequestAction.MakeGuess && countryId && pos && game.state != GameState.Ended) {
      
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

    if (action == RequestAction.EndGame) {
      if (game.state != GameState.Finished) {
        game.state = GameState.Ended
        result = true
      }
    }

  } else if (isSessionInitAction(action)) {

    result = !!session
    if (action == RequestAction.InitSessionFriend) {
      result = result && !!session.invitationCode
    }

  }

  if (game && isGameInitAction(action)) {
    if (!game.turnStartTimestamp) {
      game.turnStartTimestamp = Date.now()
    }
  }

  console.log(`${RequestAction[action]}: ${result ? "successful" : "not successful"}`)

  const { currentGame, previousGames, ...sessionWithoutGames } = session  // type SessionWithoutGames

  res.statusCode = 200
  res.end(JSON.stringify({
    // isNewGame: isNewGame,
    game: game,
    session: sessionWithoutGames,
    ...additionalResponseData }))

}

function respondWithError(res: ServerResponse<Request>, err: string = "API Error") {
  console.log(`Error: ${err}`)
  res.end(JSON.stringify({ error: err }))
}

async function cleanCache() {

  // delete sessions without users
  sessions = sessions.filter(session => session.users.length >= 1)

  // TODO delete old sessions (save timestamp on every API query)
  Object.entries(userSessionMap).filter(([user, session]) => !sessions.includes(session)).forEach(([user, session]) => {
    delete userSessionMap[user]
  })

  // delete sessions when the users have a more recent session
  // const activeSessions = Object.entries(userSessionMap).map(([user, session]) => session)
  // sessions = sessions.filter(session => activeSessions.includes(session))
  // const users = [...new Set(sessions.map(s => s.users).flat(1))]

}

function sessionInfo(session: GameSession) {
  return `#${session.index} [${session.users.join(", ")}]`
}

function createSession(
  userIdentifier: string,
  playingMode: PlayingMode,
  settings: Settings,
  invitationCode: string | undefined = undefined
) {

  // Create new session
  const session = {
    index: sessionIndex++,
    playingMode: playingMode,
    isPublic: !invitationCode,
    invitationCode: invitationCode,
    currentGame: null,
    previousGames: [],
    users: [userIdentifier],
    score: [0, 0],
    settings: settings
  } as GameSession

  sessions.push(session)
  userSessionMap[userIdentifier] = session

  console.log(`Created a new session: ${sessionInfo(session)}`)
  return session

}

function joinSession(session: GameSession, userIdentifier: string, invitationCode: string | undefined = undefined) {
  if (session.users.length >= 2 || session.playingMode == PlayingMode.Offline) {
    return false
  }
  if (!session.isPublic && session.invitationCode != invitationCode) {
    return false
  }
  if (session.currentGame) {
    // joined a session with a running game
    if (session.currentGame.users.length >= 2) {
      return false
    }
    session.currentGame.users.push(userIdentifier)
  }
  session.users.push(userIdentifier)
  userSessionMap[userIdentifier] = session
  console.log(`Joined session ${sessionInfo(session)}`)
  return true
}

const gameApi = async (req: Request, res: ServerResponse<Request>) => {

  const { userIdentifier, playingMode, invitationCode, action, player, difficulty, language }: Query = req.query as Query

  await sessionsMutex.runExclusive(async () => {

    console.log(`\nIncoming request [${RequestAction[action]}] from ${userIdentifier}: ${JSON.stringify(req.query)}`)
    // console.log(`isSessionInitAction: ${isSessionInitAction(action)}, isGameInitAction: ${isGameInitAction(action)}, isIngameAction: ${isIngameAction(action)}`)
    
    // isSessionInitAction: only create or join sessions. do not create games
    // isGameInitAction: only create games or return active games. do not create sessions

    if (isSessionInitAction(action) && action != RequestAction.RefreshSession) {
      // remove user from all existing sessions
      console.log(`Remove user ${userIdentifier} from all sessions`)
      sessions.forEach(session => {
        if (session.users.includes(userIdentifier)) {
          session.users = session.users.filter(u => u != userIdentifier)
        }
      })

    }

    cleanCache()
    // find the user's session and game if exists
    let session = _.get(userSessionMap, userIdentifier, null) as GameSession | null
    let game = session ? session.currentGame : null

    console.log(`All sessions: ${sessions.map(s => sessionInfo(s)).join(", ")}`)

    if (!isSessionInitAction(action)) {
      // need a game (find or create)
      // Check if playing modes are matching - playingMode is only specified in query for initSession actions!
      if (session && game && game.playingMode != session.playingMode) {
        console.log(`Warning: Found session/game with different playing modes. Ignoring`)
        session = null
        game = null
      }
      if (session && game && JSON.stringify(session.users) != JSON.stringify(game.users)) {
        console.log(`Warning: Found session/game with different user list (session: ${session.users.join(", ")}, game: ${game.users.join(", ")}). Ignoring`)
        session = null
        game = null
      }

      console.log(`userIdentifier ${userIdentifier}: ` + (session ? `Found existing session (#${session.index}).` : "No existing session."))

      if (!session) {
        return respondWithError(res, "Game session not found.")
      }
      if (session.users.length != 2 && session.playingMode != PlayingMode.Offline) {
        return respondWithError(res, "Your opponent has left the game.")
      }

      if (session && game && action != RequestAction.NewGame && (isIngameAction(action) || action == RequestAction.ExistingOrNewGame)) {
        // Return existing game
        // It might still be a new game to the user (when the other one started a new game)
        const gameHasChanged = false  // TODO detect if the user had a different game before (add some ID to the query?)
        const addCountryData = gameHasChanged || isGameInitAction(action)
        console.log(`Returning existing game (${addCountryData ? "do not " : ""}add country data)`)
        return await executeAndRespond(res, req.query, session, session.currentGame, { addCountryData: addCountryData })
      }

      if (!isGameInitAction(action) || language === undefined || difficulty === undefined) {
        return respondWithError(res, "Missing parameters for game selection")
      }
  
      game = await createGame(session, difficulty, language)
      if (!game) {
        return respondWithError(res, "Game could not be created.")
      }
      return await executeAndRespond(res, req.query, session, game, { addCountryData: true })

    }

    if (isSessionInitAction(action)) {

      // RefreshSession: Only action that uses an old session instance
      if (action == RequestAction.RefreshSession && playingMode == PlayingMode.Online) {
        // This is called to wait on the other opponent (random or friend). Session already exists
        if (!session) {
          return respondWithError(res, "Game session not found.")
        }
        // Just return the session data
        // The other player might have already created a game, but that will be fetched with another request.
        return await executeAndRespond(res, req.query, session, null, {})

      }

      session = null
      game = null
      
      // Find/create a new session for the user
      
      if (playingMode == PlayingMode.Offline && action == RequestAction.InitSessionOffline) {
        // console.log("playingMode Offline");
        
        // TODO TTG-35 re-integrate offline mode
        session = createSession(userIdentifier, PlayingMode.Offline, defaultSettings)
        if (!session) {
          return respondWithError(res, "Session could not be created.")
        }
        return await executeAndRespond(res, req.query, session, null, {})

      }
      
      if (playingMode == PlayingMode.Online) {
        // console.log("playingMode Online");

        if (action == RequestAction.InitSessionFriend) {
          // create invitation code
          const characters = 'ABCDEFGHJKLPQRSTUVWXYZ456789'
          const invitationCode = _.range(4).map(() => characters.charAt(Math.floor(Math.random() * characters.length))).join("")
          session = createSession(userIdentifier, playingMode, defaultSettings, invitationCode)
          return await executeAndRespond(res, req.query, session, null, {})

        }

        if (action == RequestAction.InitSessionRandom) {  // init or join. might rename
          // find session with free spots
          // TODO TTG-31 filter for sessions with matching settings (difficulty, language)
          const availableSessions = sessions.filter(session => session.users.length < 2 && session.isPublic)
          if (availableSessions.length) {
            session = availableSessions[0]
            if (!joinSession(session, userIdentifier)) {
              return respondWithError(res, "Session could not be joined.")
            }
            return await executeAndRespond(res, req.query, session, session.currentGame, { addCountryData: !!session.currentGame })
          }

          // No free session found. Create a new session
          session = createSession(userIdentifier, playingMode, defaultSettings)
          return await executeAndRespond(res, req.query, session, null, {})
          
        }

        if (action == RequestAction.JoinSession) {
          if (!invitationCode) {
            return respondWithError(res, "Invitation code not specified.")
          }
          const availableSessions = sessions.filter(session => session.users.length < 2 && !session.isPublic && session.invitationCode == invitationCode)
          if (availableSessions.length != 1) {
            return respondWithError(res, "Invalid invitation code - try again!")
          }
          session = availableSessions[0]
          if (!joinSession(session, userIdentifier, invitationCode)) {
            return respondWithError(res, "Session could not be joined.")
          }
          return await executeAndRespond(res, req.query, session, session.currentGame, { addCountryData: !!session.currentGame })
          
        }

        
      }
    }

    

  })

}

export default gameApi;

