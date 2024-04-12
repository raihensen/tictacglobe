import { error, gameIncludeIngameData, sessionIncludeCurrentGame, switchTurnsAndUpdateState } from "@/src/api.utils";
import { db } from "@/src/db";
import { Session } from "@/src/db.types";
import { ApiBody, Country, Game, Language, RequestAction, parseCountry } from "@/src/game.types";
import { GameState } from "@prisma/client";
import _ from "lodash";
import { NextRequest, NextResponse } from "next/server";
import path from 'path';
var fs = require('fs').promises;

var countryData: Record<string, Country[]> = {}

export async function POST(
  req: NextRequest,
  { params }: { params: { game: string } }
) {
  // const data = Object.fromEntries((await req.formData()).entries())
  const data = (await req.json()) as unknown as ApiBody
  const searchParams = req.nextUrl.searchParams

  const action = data.action as RequestAction
  if (!action) return error("Invalid request: No action specified")

  const gameId = Number.parseInt(params.game)
  if (!gameId) return error("Invalid request: No game ID specified")
  const userId = data.user as string
  if (!userId) return error("Invalid request: No user ID specified")

  const turnCounter = data.turn
  if (!turnCounter && turnCounter !== 0) return error("Invalid request: No turn counter specified")

  let game = await db.game.findUnique({
    where: {
      id: gameId
    },
    include: gameIncludeIngameData
  })

  if (!game) return error("Game not found", 404)
  if (game.turnCounter != turnCounter) return error("Invalid turn counter", 420)

  let session = await db.session.findUnique({
    where: { id: game.session.id },
    include: sessionIncludeCurrentGame
  })

  if (!session) return error("Session not found", 404)

  let g = new Game(game, session as unknown as Session)
  if (g.state == GameState.Finished || g.state == GameState.Ended) return error("Game has finished", 400)

  let nextState: GameState = g.state
  if (nextState == GameState.Initialized) {
    nextState = GameState.Running
  }
  let successfulGuess = false

  if (action == "EndGame") {
    // TODO check sessionAdmin rights
    nextState = GameState.Ended
  } else if (action == "PlayOn") {
    // TODO check sessionAdmin rights
    nextState = GameState.PlayingOn
  } else {
    if (game.session.playingMode == "Online")
      if (game.session.users[game.turn].id != userId) return error("It's not your turn", 403)
    const playerIndex = game.turn

    const guess = searchParams.get("guess")
    if (!guess) return error("No guess specified", 400)

    if (guess == "SKIP") {

    } else {

      const countryId = guess

      const x = Number.parseInt(searchParams.get("x") ?? "")
      const y = Number.parseInt(searchParams.get("y") ?? "")
      if (!x || !y) return error("Invalid coordinates", 400)

      if (x < 1 || y > g.setup.size || y < 1 || y > g.setup.size) {
        return error(`Invalid coords argument`, 400)
      }
      const countries = await getCountryData(g.setup.language)
      if (!countries) {
        return error(`Country data not found`, 400)
      }
      const country = countries.find(c => c.iso == countryId)
      if (!country) {
        return error(`Country "${countryId}" not found`, 400)
      }
      const { i, j } = g.getIJ(x, y)
      if (g.marking[i][j] != -1 || g.guesses[i][j]) {
        return error(`Cell (${x}|${y}) already occupied`, 400)
      }

      // check correct solution
      if (g.isValidGuess(x, y, country)) {
        // execute
        const gameUpdatedAt = Math.max(game.createdAt.getTime(), ...game.markings.map(m => m.createdAt.getTime()))
        await db.marking.create({
          data: {
            x: x,
            y: y,
            gameId: g.id,
            player: playerIndex,
            userId: userId,
            value: countryId,
            thinkingTime: (new Date().getTime() - gameUpdatedAt) / 1000
          }
        })
        console.log(`Set (${x}|${y}) to ${country.iso} (player ${playerIndex} / ${userId})`)
        successfulGuess = true

        // Fetch game object again
        game = await db.game.findUnique({
          where: {
            id: gameId
          },
          include: gameIncludeIngameData
        })
        if (!game) return error("Internal server error", 500)
        g = new Game(game, session as unknown as Session)

        // Check win
        if (g.state != GameState.Decided) {
          const winner = await checkWinner(g)
          if (winner !== null) {
            console.log(`WINNER: Player ${winner}`)
            nextState = GameState.Decided
          }
        }
        if (g.marking.flat(1).every(m => m != -1)) {
          nextState = GameState.Finished
        }

      } else {
        console.log(`Wrong guess ((${x}|${y}), ${country.name})`)
      }

    }

  }

  game = await switchTurnsAndUpdateState(game, action, nextState, successfulGuess)

  session = await db.session.findUnique({
    where: { id: game.sessionId },
    include: sessionIncludeCurrentGame
  })

  return NextResponse.json({
    session: session,
    game: game,
    success: true
  })

}


const _winningFormations: Record<string, {
  i: number,
  j: number
}[][]> = {}  // saves all combinations of coords leading to a win (axes: combination, coord pair, coord)
function getWinningFormations(size: number) {
  if (size < 2) {
    return []
  }
  const sizeKey = `${size}x${size}`
  if (sizeKey in _winningFormations) {
    return _winningFormations[sizeKey]
  }
  const eachCoord = _.range(size)
  const formations = [
    ...eachCoord.map(i => eachCoord.map(j => ({ i, j }))),  // rows
    ...eachCoord.map(j => eachCoord.map(i => ({ i, j }))),  // columns
    eachCoord.map(i => ({ i: i, j: i })),  // diagonal 1
    eachCoord.map(i => ({ i: i, j: size - i - 1 }))  // diagonal 2
  ]
  _winningFormations[sizeKey] = formations
  return formations
}

/**
 * Checks if there is a winner. If there is a (unique) winner, set winner and winCoords on the game instance.
 * @param game Game instance
 * @returns The winner (0, 1), -1 for a draw, or null
 */
async function checkWinner(game: Game) {
  if (game.state != "Initialized" && game.state != "Running") {
    return null
  }
  const winningFormations = getWinningFormations(game.setup.size)
  const playerIndices = [0, 1]
  const formationMarkings = winningFormations.map(formation => formation.map(({ i, j }) => ({ i, j, player: game.marking[i][j] })))
  const wins = formationMarkings.filter(formation => playerIndices.some(
    p => formation.every(({ i, j, player }) => player == p)
  ))
  // console.log("formationMarkings")
  // formationMarkings.forEach(f => console.log(JSON.stringify(f)))
  // console.log("wins")
  // wins.forEach(f => console.log(JSON.stringify(f)))
  if (wins.length > 0) {
    const winners = [...new Set(wins.map(win => win[0].player))]
    if (winners.length == 1) {
      const winner = winners[0]
      await db.game.update({
        where: { id: game.id },
        data: {
          winner: winner,
        }
      })
      await db.marking.updateMany({
        where: {
          OR: wins.flatMap(formation => formation.map(({ i, j }) => ({
            AND: {
              gameId: game.id,
              ...game.getXY(i, j),
            }
          })))
        },
        data: {
          isWinning: true
        }
      })
      await db.session.update({
        where: { id: game.session.id },
        data: {
          score1: {
            increment: winner == 0 ? 1 : 0
          },
          score2: {
            increment: winner == 1 ? 1 : 0
          }
        }
      })
      return winner
    }
    // Both players can have winning formations if after a win the players decide to continue playing
    // If this happens, this function should not be called though
    return null
  }
  // No winner. Check draw
  if (
    game.marking.flat(1).every(player => player != -1) ||  // board is full
    formationMarkings.every(formation => playerIndices.every(  // all wins blocked
      playerIndex => formation.some(({ i, j, player }) => player == playerIndex)
    ))
  ) {
    await db.game.update({
      where: { id: game.id },
      data: {
        winner: -1,
      }
    })
    return -1
  }
  return null
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

