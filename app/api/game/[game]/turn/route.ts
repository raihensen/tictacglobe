import { error, gameIncludeIngameData, sessionIncludeCurrentGame } from "@/src/api.utils";
import { getCountryData } from "@/src/backend.util";
import { db } from "@/src/db";
import { Game as DbGame, Session } from "@/src/db.types";
import { ApiRequestBodyTurn, Game, RequestAction } from "@/src/game.types";
import { GameState } from "@prisma/client";
import _ from "lodash";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ game: string }> }
) {
  const serverReceivedAt = Date.now()
  const gameId = Number.parseInt((await params).game)
  if (!gameId) return error("Invalid request: No game ID specified")

  const {
    action,
    user: userId,
    turn: turnCounter,
    turnStartTimestamp: clientTurnStartTimestamp,
    clientSentAt,
    latency,
  } = (await req.json()) as unknown as ApiRequestBodyTurn

  if (!action) return error("Invalid request: No action specified")
  if (!userId) return error("Invalid request: No user ID specified")

  const searchParams = req.nextUrl.searchParams
  if (!turnCounter && turnCounter !== 0) return error("Invalid request: No turn counter specified")

  console.log({
    latency,
    serverReceivedAt,
    clientSentAt,
    clientToServerDelay: serverReceivedAt - clientSentAt
  })
  const clientTimeToServerTime = (t: number) => t + (serverReceivedAt - clientSentAt) - latency

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

    if (action == "StartTimer") {
      if (!clientTurnStartTimestamp) return error("No turn start timestamp specified", 400)
      await db.game.update({
        where: {
          id: game.id
        },
        data: {
          turnStartTimestamp: new Date(clientTimeToServerTime(clientTurnStartTimestamp))
        }
      })
    } else if (action == "MakeGuess") {
      const guess = searchParams.get("guess")
      if (!guess) return error("No guess specified", 400)


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

    } else {
      if (action == "EndTurn" || action == "TimeElapsed") {

      } else {
        return error(`Invalid action "${action}"`, 400)
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
    serverReceivedAt,  // TODO remove
    serverRespondedAt: Date.now(),  // TODO remove
    serverProcessingTime: Date.now() - serverReceivedAt,
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

async function switchTurnsAndUpdateState(
  game: DbGame,
  action: RequestAction,
  state: GameState,
  changeUpdatedAt: boolean
) {
  const currentTimestamp = new Date()
  const switchTurns = state != GameState.Finished && state != GameState.Ended && (["MakeGuess", "EndTurn", "TimeElapsed"].includes(action))
  const updateTurnStartTimestamp = false
  // const updateTurnStartTimestamp = switchTurns || action == "PlayOn"
  // TODO client should set turnStartTimestamp. Need extra route for that

  return db.game.update({
    where: {
      id: game.id
    },
    data: {
      ...(switchTurns ? {
        turn: 1 - game.turn,
        turnCounter: {
          increment: 1
        },
      } : {}),
      // turnStartTimestamp: updateTurnStartTimestamp ? currentTimestamp : undefined,
      turnStartTimestamp: null,
      updatedAt: changeUpdatedAt ? currentTimestamp : undefined,
      state: state
    },
    include: gameIncludeIngameData
  })
}
