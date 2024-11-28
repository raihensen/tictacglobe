import { error, sessionIncludeCurrentGame } from "@/src/api.utils";
import { db } from "@/src/db";
import { ApiRequestBodyUpdateSettings } from "@/src/game.types";
import { NextRequest, NextResponse } from "next/server";


export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ session: string }> }
) {
  const sessionId = Number.parseInt((await params).session)
  if (!sessionId) return error("Invalid request", 400)

  const {
    user: userId,
    settings,
  } = (await req.json()) as unknown as ApiRequestBodyUpdateSettings

  if (!settings) error("Invalid settings format", 400)

  let session = await db.session.findUnique({
    where: { id: sessionId },
    include: sessionIncludeCurrentGame
  })
  if (!session) return error("Session not found", 404)
  if (!userId) return error("Invalid request", 400)
  if (!session.users.map(u => u.id).includes(userId)) return error("User not part of the session", 403)
  try {
    session = await db.session.update({
      where: { id: sessionId },
      data: {
        settings: JSON.stringify(settings)
      },
      include: sessionIncludeCurrentGame,
    })
  } catch (e) {
    return error("Invalid settings format", 400)
  }

  if (!session) return error("Session not found", 404)

  return NextResponse.json({
    session: session,
    game: session.games[0],
    success: true
  })

}

