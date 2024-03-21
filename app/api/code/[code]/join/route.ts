import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";

import { Session, SessionState, Player, PlayerState } from "@/src/types";
import { error, respond, refreshState } from "@/src/api.utils";
import { PrismaClient, Topic } from '@prisma/client'
import { db } from "@/src/db";


export async function POST(
  req: NextRequest,
  { params }: { params: { code: string } }
) {

  const data = await req.formData()

  if (!params.code) return error("Invalid request", 400)
  const session = await await db.session.findFirst({
    where: {
      invitationCode: params.code,
      state: { not: SessionState.CLOSED }
    },
    include: { players: { include: { topics: true } } }
  })
  if (!session) return error("Session not found", 404)

  const firstName = data.get("firstName") as string
  const lastName = data.get("lastName") as string
  if (!firstName || firstName.length == 0) return error("Missing first name", 400)
  if (!lastName || lastName.length == 0) return error("Missing last name", 400)

  const name = `${firstName} ${lastName}`
  if (session.players.some(p => p.name == name)) return error(`Pick another name, ${name} is already playing!`)

  const newPlayer = await db.player.create({
    data: {
      name: name,
      firstName: firstName,
      lastName: lastName,
      state: PlayerState.JOINED,
      sessionId: session.id
    }
  })
  const player = await db.player.findUnique({ where: { id: newPlayer.id }, include: { topics: true } })
  if (!player) return error("Internal Server Error", 500)

  await refreshState(session)
  return respond(session, player)

}

