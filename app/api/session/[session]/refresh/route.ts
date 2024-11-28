import { error, sessionIncludeCurrentGame } from "@/src/api.utils";
import { db } from "@/src/db";
import { ApiRequestBodyRefreshSession } from "@/src/game.types";
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
  } = (await req.json()) as unknown as ApiRequestBodyRefreshSession

  if (settings) {
    // Need authentication if settings are changed
    const session = await db.session.findUnique({
      where: { id: sessionId },
      include: sessionIncludeCurrentGame
    })
    if (!session) return error("Session not found", 404)
    if (!userId) return error("Invalid request", 400)
    if (!session.users.map(u => u.id).includes(userId)) return error("User not part of the session", 403)
    try {
      await db.session.update({
        where: { id: sessionId },
        data: {
          settings: JSON.stringify(settings)
        }
      })
    } catch (e) {
      return error("Invalid settings format", 400)
    }
  }

  const session = await db.session.findUnique({
    where: { id: sessionId },
    include: sessionIncludeCurrentGame
  })
  if (!session) return error("Session not found", 404)

  return NextResponse.json({
    session: session,
    game: session.games[0],
    success: true
  })

}

