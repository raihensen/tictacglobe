import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";

import { Session, SessionState, Player, PlayerState } from "@/src/types";
import { error, respond, refreshState } from "@/src/api.utils";
import { PrismaClient, Topic } from '@prisma/client'
import { db } from "@/src/db";


export async function POST(
  req: NextRequest,
  { params }: { params: { session: string, player: string } }
) {

  if (!params.session) return error("Invalid request")
  const session = await db.session.findFirst({ where: { id: params.session }, include: { players: { include: { topics: true } } } })
  if (!session) return error("Session not found", 404)

  if (!params.player) return error("Invalid request")
  const player = session.players.find(p => p.id == params.player)
  if (!player) return error("Player not found", 404)

  const data = await req.formData()
  const styleInstruction = data.get("styleInstruction") as string | null
  const hasStyleInstruction = !!styleInstruction

  await db.player.update({ data: { styleInstruction: styleInstruction, hasStyleInstruction: hasStyleInstruction }, where: { id: player.id }})

  return NextResponse.json({
    success: true
  })

}

