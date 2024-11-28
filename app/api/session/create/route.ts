import { error, findSessionWithCurrentGame, generateInvitationCode, invitationCodeAlive, joinSession } from "@/src/api.utils";
import { db } from "@/src/db";
import { ApiRequestBodyCreateSession, defaultSettings } from "@/src/game.types";
import { PlayingMode, PrismaClient } from '@prisma/client';
import { NextRequest, NextResponse } from "next/server";


export async function POST(
  req: NextRequest
) {
  // need POST also to avoid caching

  const {
    action,
    user: userId,
    language,
  } = (await req.json()) as unknown as ApiRequestBodyCreateSession

  if (!userId) return error("Invalid request: No user ID specified", 400)
  const user = await db.user.findUnique({ where: { id: userId as string } })
  if (!user) return error("User not found", 404)

  const playingMode = (action == "InitSessionOffline" ? PlayingMode.Offline : PlayingMode.Online)
  const settings = defaultSettings  // TODO send

  // Generate invitation code (if InitSessionFriend)
  let invitationCode = null
  if (action == "InitSessionFriend") {
    invitationCode = await generateNewInvitationCode(db)
    if (!invitationCode) return error("Internal Server Error", 500)
  }

  // Join existing random session?
  if (action == "InitSessionRandom") {
    // TODO TTG-31 filter for sessions with matching settings (difficulty, language)
    const availableSessions = await db.session.findMany({
      where: {
        AND: {
          isPublic: true,
          playingMode: PlayingMode.Online,
          isFull: false,
          isAlive: true,
          language: language,
          users: { none: { id: user.id } },
        }
      },
      orderBy: {
        createdAt: "asc"
      },
      take: 1
    })
    if (availableSessions.length) {
      const sessionToJoin = availableSessions[0]
      const { session } = await joinSession(sessionToJoin, user)

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
      isPublic: action == "InitSessionRandom",
      settings: JSON.stringify(settings),
      language: language,
      playingMode: playingMode,
      users: {
        connect: { id: user.id }
      },
      color1: "blue",  // TODO
    },
    include: {
      users: true
    }
  })
  const session = await findSessionWithCurrentGame(newSession.id)
  if (!session) return error("Internal Server Error", 500)

  return NextResponse.json({
    user: user,
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

