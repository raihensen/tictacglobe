import { NextRequest, NextResponse } from "next/server";

import { error, invitationCodeAlive, joinSession, sessionIncludeCurrentGame } from "@/src/api.utils";
import { db } from "@/src/db";
import { RequestAction } from "@/src/game.types";


export async function GET(
  req: NextRequest,
  { params }: { params: { session: string } }
) {
  // might need POST also to avoid caching

  const sessionId = Number.parseInt(params.session)
  if (!sessionId) return error("Invalid request", 400)

  const session = await db.session.findUnique({
    where: { id: sessionId },
    include: sessionIncludeCurrentGame
  })

  return NextResponse.json({
    session: session,
    success: true
  })

}

