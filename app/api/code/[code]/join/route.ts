import { NextRequest, NextResponse } from "next/server";

import { error, invitationCodeAlive, joinSession, sessionIncludeCurrentGame } from "@/src/api.utils";
import { db } from "@/src/db";
import { RequestAction } from "@/src/game.types";


export async function POST(
  req: NextRequest,
  { params }: { params: { code: string } }
) {
  // need POST also to avoid caching
  const data = Object.fromEntries((await req.formData()).entries())

  const action = data.action as unknown as RequestAction
  const name = data.name as unknown as string | undefined

  if (!params.code) return error("Invalid request", 400)
  const sessionFromCode = await db.session.findFirst({
    where: {
      invitationCode: params.code,
      ...invitationCodeAlive()
    }
  })
  if (!sessionFromCode) return error("Session not found", 404)

  const session = await joinSession(sessionFromCode.id, name)

  return NextResponse.json({
    session: session,
    success: true
  })

}

