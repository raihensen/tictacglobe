import { NextRequest, NextResponse } from "next/server";
import { error, gameIncludeIngameData, sessionIncludeCurrentGame, switchTurns } from "@/src/api.utils";
import { db } from "@/src/db";
import { Country, Game, Language, parseCountry } from "@/src/game.types";
var fs = require('fs').promises;
import path from 'path';
import { GameState } from "@prisma/client";
import { Session } from "@/src/db.types";

var countryData: Record<string, Country[]> = {}

export async function POST(
  req: NextRequest,
  { params }: { params: { game: string } }
) {
  const data = Object.fromEntries((await req.formData()).entries())
  const searchParams = req.nextUrl.searchParams

  const gameId = Number.parseInt(params.game)
  if (!gameId) return error("Invalid request")
  const userId = data.user as string
  if (!userId) return error("Invalid request")

  if (!data.turn) return error("Invalid request")
  const turnCounter = Number.parseInt(data.turn as string)
  if (!turnCounter && turnCounter !== 0) return error("Invalid request")

  let game = await db.game.findUnique({
    where: {
      id: gameId
    },
    include: gameIncludeIngameData
  })

  if (!game) return error("Game not found", 404)
  if (game.session.users[game.turn].id != userId) return error("It's not your turn", 403)
  const playerIndex = game.turn
  if (game.turnCounter != turnCounter) return error("Invalid turn counter", 420)

  let session = await db.session.findUnique({
    where: { id: game.session.id },
    include: sessionIncludeCurrentGame
  })
  
  if (!session) return error("Session not found", 404)
  const g = new Game(game, session as unknown as Session)
  if (g.state == GameState.Finished || g.state == GameState.Ended) return error("Game has finished", 400)

  const guess = searchParams.get("guess")
  if (!guess) return error("No guess specified", 400)
  const countryId = guess

  const x = Number.parseInt(searchParams.get("x") ?? "")
  const y = Number.parseInt(searchParams.get("y") ?? "")
  if (!x || !y) return error("Invalid coordinates", 400)

  if (x < 1 || y > g.setup.size || y < 1 || y > g.setup.size) {
    return error(`Invalid coords argument`, 400)
  }
  const countries = await getCountryData(g.setup.language)
  if (!countries) {
    return error(`Country data not found`, 400)
  }
  const country = countries.find(c => c.iso == countryId)
  if (!country) {
    return error(`Country "${countryId}" not found`, 400)
  }
  const { i, j } = g.getIJ(x, y)
  if (g.marking[i][j] != -1 || g.guesses[i][j]) {
    return error(`Cell (${x}|${y}) already occupied`, 400)
  }

  // check correct solution
  if (g.isValidGuess(x, y, country)) {
    // execute
    await db.marking.create({
      data: {
        x: x,
        y: y,
        gameId: game.id,
        player: playerIndex,
        userId: userId,
        value: countryId
      }
    })
    console.log(`Set (${x},${y}) to ${country.iso} (player ${playerIndex} / ${userId})`);

    // TODO check win

  } else {
    console.log(`Wrong guess ((${x}|${y}), ${country.name})`)
  }

  game = await switchTurns(game)

  session = await db.session.findUnique({
    where: { id: game.sessionId },
    include: sessionIncludeCurrentGame
  })

  return NextResponse.json({
    session: session,
    game: game,
    success: true
  })

}

async function getCountryData(language: Language): Promise<Country[] | null> {

  if (language.toString() in countryData) {
    return countryData[language.toString()]
  }
  const file = path.join(process.cwd(), 'public', 'data', 'countries', `countries-${language}.json`)
  console.log(`Read countries from file ${file}...`)
  try {
    const data: any = await fs.readFile(file)
    let countries = JSON.parse(data).map(parseCountry) as Country[]
    countryData[language.toString()] = countries
    return countries
  } catch (err) {
    return null
  }
}

