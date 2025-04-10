import { error, sessionIncludeCurrentGame } from "@/src/api.utils";
import { getCountryData } from "@/src/backend.util";
import { db } from "@/src/db";
import { Language } from "@/src/game.types";
import { NextRequest, NextResponse } from "next/server";

/**
 * For the given session, returns the currently running game.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ session: string }> }
) {

  const sessionId = Number.parseInt((await params).session)

  if (!sessionId) return error("Invalid request", 400)

  let session = await db.session.findFirst({
    where: { id: sessionId },
    orderBy: { createdAt: "desc" },
    include: sessionIncludeCurrentGame
  })
  if (!session) return error("Session not found", 404)
  // if (!session.users.some(u => u.id == userId)) return error("User not part of the session", 403)
  if (!session.isAlive) return error("Session has ended", 404)

  // Get country data
  const countries = await getCountryData(session.language as Language)
  if (!countries) return error("Country data could not be read", 500)

  return NextResponse.json({
    session: session,
    game: session.games[0],
    countries: countries,
    success: true
  })

}

