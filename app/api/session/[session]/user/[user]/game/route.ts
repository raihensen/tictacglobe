import { error, sessionIncludeCurrentGame } from "@/src/api.utils";
import { chooseGameSetup, getCountryData } from "@/src/backend.util";
import { db } from "@/src/db";
import { Language, Settings } from "@/src/game.types";
import { NextRequest, NextResponse } from "next/server";

/**
 * For the given session and user, returns the currently running game.
 * If the session has no running game, or it is forced (?newGame), a new game is created.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { session: string, user: string } }
) {

  const searchParams = req.nextUrl.searchParams

  const sessionId = Number.parseInt((await params).session)
  const userId = (await params).user
  const newGame = !!searchParams.get("newGame")

  if (!sessionId) return error("Invalid request", 400)
  if (!userId) return error("Invalid request", 400)

  let session = await db.session.findUnique({
    where: { id: sessionId },
    include: sessionIncludeCurrentGame
  })
  if (!session) return error("Session not found", 404)
  if (!session.users.some(u => u.id == userId)) return error("User not part of the session", 403)

  const settings = JSON.parse(session.settings) as Settings

  // Create new game?
  if (newGame || !session.games.length) {
    const gameSetup = await chooseGameSetup(
      session.language as Language,
      gameSetup => {
        return gameSetup.data.difficultyLevel == settings.difficulty
      }
    )
    if (!gameSetup) return error("Could not create a game", 500)
    const game = await db.game.create({
      data: {
        setup: JSON.stringify(gameSetup),
        language: session.language,
        turn: (Math.random() < .5 ? 0 : 1),
        sessionId: session.id,
      },
      include: {
        markings: true
      }
    })
  }

  // Get country data
  const countries = await getCountryData(session.language as Language)
  if (!countries) return error("Country data could not be read", 500)

  // Get session with latest game (including if it's the one just created)
  session = await db.session.findUnique({
    where: { id: sessionId },
    include: sessionIncludeCurrentGame
  })
  if (!session) return error("Could not create a game", 500)

  return NextResponse.json({
    session: session,
    game: session.games[0],
    countries: countries,
    success: true
  })

}

