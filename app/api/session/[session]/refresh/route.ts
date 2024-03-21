import { NextRequest, NextResponse } from "next/server";
// import { Session, SessionState, Player, PlayerState } from "@/src/types";
import { error, respond, refreshState } from "@/src/api.utils";
import { db } from "@/src/db";


export async function POST(
  req: NextRequest,
  { params }: { params: { session: string } }
) {
  // POST to avoid caching

  const sessionId = params.session

  if (!sessionId) return error("Invalid request")
  const session = await db.session.findFirst({ where: { id: sessionId }, include: { players: { include: { topics: true } } } })

  if (!session) return error("Session could not be created", 400)

  await refreshState(session)
  return respond(session)

}

