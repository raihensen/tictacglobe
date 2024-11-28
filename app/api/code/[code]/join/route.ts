import { NextRequest, NextResponse } from "next/server";

import { error, invitationCodeAlive, joinSession } from "@/src/api.utils";
import { db } from "@/src/db";
import { ApiRequestBodyTurn } from "@/src/game.types";


export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  // need POST also to avoid caching
  const { code } = await params
  if (!code) return error("Invalid request: No code specified", 400)

  const {
    action,
    user: userId
  } = (await req.json()) as unknown as ApiRequestBodyTurn

  if (!userId) return error("Invalid request: No user ID specified", 400)
  const user = await db.user.findUnique({ where: { id: userId as string } })
  if (!user) return error("User not found", 404)

  const sessionFromCode = await db.session.findFirst({
    where: {
      invitationCode: code,
      ...invitationCodeAlive()
    }
  })
  if (!sessionFromCode) return error("Session not found", 404)

  const { session } = await joinSession(sessionFromCode, user)

  return NextResponse.json({
    user: user,
    session: session,
    success: true
  })

}

