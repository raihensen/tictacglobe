import { NextRequest, NextResponse } from "next/server";
import { error, findSessionWithCurrentGame, respond } from "@/src/api.utils";
import { db } from "@/src/db";


export async function GET(
  req: NextRequest,
  { params }: { params: { session: number } }
) {

  const sessionId = params.session
  if (!sessionId) return error("Invalid request")

  const session = await findSessionWithCurrentGame(sessionId)
  if (!session) return error("Session not found", 404)

  const game = session.games[0]
  if (!game) return error("Game not found", 404)
  // await refreshState(session)

  return NextResponse.json({
    session: session,
    success: true
  })

}

