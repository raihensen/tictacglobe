import { NextRequest, NextResponse } from "next/server";
import { error, findSessionWithCurrentGame, invitationCodeAlive, respond } from "@/src/api.utils";
import { PlayingMode, PrismaClient } from '@prisma/client'
import { generateInvitationCode } from "@/src/api.utils";
import { db } from "@/src/db";
import { RequestAction, defaultSettings } from "@/src/game.types";


export async function POST(
  req: NextRequest,
  { params }: { params: {} }
) {
  // need POST also to avoid caching
  const data = Object.fromEntries((await req.formData()).entries())

  const action = data.action as unknown as RequestAction
  const name = data.name as unknown as string | undefined
  
  const playingMode = (action == RequestAction.InitSessionOffline ? PlayingMode.Offline : PlayingMode.Online)
  const settings = defaultSettings

  // Generate invitation code (if InitSessionFriend)
  let invitationCode = null
  if (action == RequestAction.InitSessionFriend) {
    invitationCode = await generateNewInvitationCode(db)
    if (!invitationCode) return error("Internal Server Error", 500)
  }

  // Create session in db
  const newSession = await db.session.create({
    data: {
      invitationCode: invitationCode,
      isPublic: action == RequestAction.InitSessionRandom,
      settings: JSON.stringify(settings),
      playingMode: playingMode,
      users: {
        create: {
          name: name
        }
      }
    }
  })
  const session = await findSessionWithCurrentGame(newSession.id)
  if (!session) return error("Internal Server Error", 500)

  return NextResponse.json({
    session: session,
    success: true
  })

}


async function generateNewInvitationCode(db: PrismaClient): Promise<string | false> {
  for (let i = 0; i < 10; i++) {
    let invitationCode = generateInvitationCode(4)
    if (!await db.session.findFirst({
      where: {
        AND: {
          invitationCode: invitationCode,
          ...invitationCodeAlive()
        }
      }
    })) {
      return invitationCode
    }
  }
  return false
}

