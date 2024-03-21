import { NextRequest, NextResponse } from "next/server";

import { error, invitationCodeAlive, joinSession, sessionIncludeCurrentGame } from "@/src/api.utils";
import { db } from "@/src/db";
import { RequestAction } from "@/src/game.types";


export async function POST(
  req: NextRequest,
  { params }: { params: { session: number } }
) {
  // need POST also to avoid caching
  const data = Object.fromEntries((await req.formData()).entries())

  const action = data.action as unknown as RequestAction
  const sessionId = params.session
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

