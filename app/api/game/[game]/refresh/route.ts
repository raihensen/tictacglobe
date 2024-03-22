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

  let game = await db.game.findUnique({
    where: {
      id: gameId
    },
    include: gameIncludeIngameData
  })

  if (!game) return error("Game not found", 404)
  if (!game.session.users.map(u => u.id).includes(userId)) return error("User not part of the session", 403)

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