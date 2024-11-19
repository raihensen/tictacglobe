import { NextRequest, NextResponse } from "next/server";

import { error, invitationCodeAlive, joinSession } from "@/src/api.utils";
import { db } from "@/src/db";
import { RequestAction } from "@/src/game.types";


export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  // need POST also to avoid caching
  const data = Object.fromEntries((await req.formData()).entries())

  const action = data.action as unknown as RequestAction
  const name = data.name as unknown as string | undefined
  const { code } = await params

  if (code) return error("Invalid request", 400)
  const sessionFromCode = await db.session.findFirst({
    where: {
      invitationCode: code,
      ...invitationCodeAlive()
    }
  })
  if (!sessionFromCode) return error("Session not found", 404)

  const { session, user } = await joinSession(sessionFromCode.id, name)

  return NextResponse.json({
    user: user,
    session: session,
    success: true
  })

}

