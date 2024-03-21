import { NextRequest, NextResponse } from "next/server";
// import { Session, SessionState, Player, PlayerState } from "@/src/types";
import { error, respond, refreshState } from "@/src/api.utils";
import { PrismaClient, Topic } from '@prisma/client'
import { db } from "@/src/db";


export async function GET(
  req: NextRequest,
  { params }: { params: { session: string } }
) {

  const sessionId = params.session

  if (!sessionId) return error("Invalid request")
  let session = await db.session.findFirst({ where: { id: sessionId }, include: { players: { include: { topics: true } } } })
  if (!session) return error("Session not found", 404)
  await refreshState(session)

  return NextResponse.json({
    session: session,
    success: true
  })

}

