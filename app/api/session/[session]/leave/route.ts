import { error } from "@/src/api.utils";
import { db } from "@/src/db";
import { NextRequest, NextResponse } from "next/server";


export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ session: string }> }
) {
  const sessionId = Number.parseInt((await params).session)
  if (!sessionId) return error("Invalid request", 400)

  const session = await db.session.update({
    where: { id: sessionId },
    data: {
      isAlive: false,
    },
  })
  if (!session) return error("Session not found", 404)

  return NextResponse.json({
    session,
    success: true
  })

}

