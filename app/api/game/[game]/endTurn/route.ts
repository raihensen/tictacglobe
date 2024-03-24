import { NextRequest, NextResponse } from "next/server";
import { error, gameIncludeIngameData, sessionIncludeCurrentGame, switchTurns } from "@/src/api.utils";
import { db } from "@/src/db";

export async function POST(
  req: NextRequest,
  { params }: { params: { game: string } }
) {
  const data = Object.fromEntries((await req.formData()).entries())

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
  if (game.session.users[game.turn].id != userId) return error("It's not your turn", 403)  // TODO offline
  if (game.turnCounter != turnCounter) return error("Invalid turn counter", 420)

  game = await switchTurns(game)

  const session = await db.session.findUnique({
    where: { id: game.sessionId },
    include: sessionIncludeCurrentGame
  })

  return NextResponse.json({
    session: session,
    game: game,
    success: true
  })

}