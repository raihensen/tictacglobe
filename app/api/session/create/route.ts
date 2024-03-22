import { NextRequest, NextResponse } from "next/server";
import { error, findSessionWithCurrentGame, invitationCodeAlive, joinSession, respond } from "@/src/api.utils";
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

  // Join existing random session?
  if (action == RequestAction.InitSessionRandom) {
    // TODO TTG-31 filter for sessions with matching settings (difficulty, language)
    const availableSessions = await db.session.findMany({
      where: {
        AND: {
          isPublic: true,
          playingMode: PlayingMode.Online,
          isFull: false,
          isAlive: true
        }
      },
      orderBy: {
        createdAt: "asc"
      },
      take: 1
    })
    if (availableSessions.length) {
      const sessionToJoin = availableSessions[0]
      const { session, user } = await joinSession(sessionToJoin.id, name)
      
      if (!session) return error("Internal Server Error", 500)
      return NextResponse.json({
        user: user,
        session: session,
        success: true
      })
    }
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
    },
    include: {
      users: true
    }
  })
  const session = await findSessionWithCurrentGame(newSession.id)
  if (!session) return error("Internal Server Error", 500)

  return NextResponse.json({
    user: newSession.users[0],
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

