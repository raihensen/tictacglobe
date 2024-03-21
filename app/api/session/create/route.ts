import { NextRequest, NextResponse } from "next/server";
// import { Session, SessionState, Player, PlayerState } from "@/src/types";
import { error, respond, refreshState } from "@/src/api.utils";
import { PrismaClient, Topic } from '@prisma/client'
import { generateInvitationCode } from "@/src/utils";
import { SessionState } from "@/src/types";
import { db } from "@/src/db";


async function generateNewInvitationCode(db: PrismaClient) {
  for (let i = 0; i < 10; i++) {
    let invitationCode = generateInvitationCode()
    if (!await db.session.findFirst({
      where: {
        invitationCode: invitationCode,
        state: { not: SessionState.CLOSED }
      }
    })) {
      return invitationCode
    }
  }
  return false
}


export async function POST(
  req: NextRequest,
  { params }: { params: {} }
) {
  // POST to avoid caching

  const invitationCode = await generateNewInvitationCode(db)
  if (!invitationCode) return error("Internal Server Error", 500)
  const newSession = await db.session.create({
    data: {
      invitationCode: invitationCode,
      state: SessionState.INIT
    }
  })
  const session = await db.session.findUnique({ where: { id: newSession.id }, include: { players: { include: { topics: true } } } })
  if (!session) return error("Internal Server Error", 500)

  return NextResponse.json({
    session: session,
    success: true
  })

}

