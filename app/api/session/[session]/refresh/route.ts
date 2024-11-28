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
  } = (await req.json()) as unknown as ApiRequestBodyRefreshSession

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

