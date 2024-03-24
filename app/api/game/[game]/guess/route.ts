import { NextRequest, NextResponse } from "next/server";
import { error, gameIncludeIngameData, sessionIncludeCurrentGame, switchTurnsAndUpdateState as switchTurnsAndUpdateState } from "@/src/api.utils";
import { db } from "@/src/db";
import { Country, Game, Language, parseCountry } from "@/src/game.types";
var fs = require('fs').promises;
import path from 'path';
import { GameState } from "@prisma/client";
import { Session } from "@/src/db.types";
import _ from "lodash";

var countryData: Record<string, Country[]> = {}

export async function POST(
  req: NextRequest,
  { params }: { params: { game: string } }
) {
  const data = Object.fromEntries((await req.formData()).entries())
  const searchParams = req.nextUrl.searchParams

  const gameId = Number.parseInt(params.game)
  if (!gameId) return error("Invalid request")
  const userId = data.user as string
  if (!userId) return error("Invalid request")

  if (!data.turn) return error("Invalid request")
  const turnCounter = Number.parseInt(data.turn as string)
  if (!turnCounter && turnCounter !== 0) return error("Invalid request")

  let game = await db.game.findUnique({
    where: {
      id: gameId
    },
    include: gameIncludeIngameData
  })

  if (!game) return error("Game not found", 404)
  if (game.session.users[game.turn].id != userId) return error("It's not your turn", 403)
  const playerIndex = game.turn
  if (game.turnCounter != turnCounter) return error("Invalid turn counter", 420)

  let session = await db.session.findUnique({
    where: { id: game.session.id },
    include: sessionIncludeCurrentGame
  })
  
  if (!session) return error("Session not found", 404)
  const g = new Game(game, session as unknown as Session)
  if (g.state == GameState.Finished || g.state == GameState.Ended) return error("Game has finished", 400)

  let nextState: GameState = g.state
  if (nextState == GameState.Initialized) {
    nextState = GameState.Running
  }

  let successfulGuess = false
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

      // Check win
      if (g.state != GameState.Decided) {
        const winner = checkWinner(g)
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

  game = await switchTurnsAndUpdateState(game, nextState, successfulGuess)

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


const _winningFormations: Record<string, number[][][]> = {}  // saves all combinations of coords leading to a win (axes: combination, coord pair, coord)
function getWinningFormations(size: number) {
  if (size < 2) {
    return []
  }
  const sizeKey = `${size}x${size}`
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

/**
 * Checks if there is a winner. If there is a (unique) winner, set winner and winCoords on the game instance.
 * @param game Game instance
 * @returns The winner (0, 1), -1 for a draw, or null
 */
async function checkWinner(game: Game) {
  const winningFormations = getWinningFormations(game.setup.size)
  const playerIndices = [0, 1]
  const wins = winningFormations.filter(formation => playerIndices.some(
    playerIndex => formation.every(([i, j]) => game.marking[i][j] == playerIndex)
  ))
  if (wins.length > 0) {
    const winners = [...new Set(wins.map(win => game.marking[win[0][0]][win[0][1]]))]
    if (winners.length == 1) {
      await db.game.update({
        where: { id: game.id },
        data: {
          winner: winners[0],
        }
      })
      await db.marking.updateMany({
        where: {
          OR: wins[0].map(c => ({
            AND: {
              gameId: game.id,
              ...game.getXY(c[0], c[1]),
            }
          }))
        },
        data: {
          isWinning: true
        }
      })
      return winners[0]
    }
    // Both players can have winning formations if after a win the players decide to continue playing
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

