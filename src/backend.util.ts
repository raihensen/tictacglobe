import _ from "lodash";
import { GameSetup, Language } from "./game.types";
import path from "path";
var fs = require('fs').promises;

export function randomChoice<T>(arr: Array<T>): T | undefined {
  if (!arr.length) {
    return undefined
  }
  return arr[Math.floor(arr.length * Math.random())];
}


export async function chooseGameSetup(
  language: Language,
  filter: ((gameSetup: GameSetup) => boolean) | null = null
): Promise<GameSetup | null> {

  // const allFiles = await fs.readdir("./data")
  // console.log(`all files: ${allFiles.join(", ")}`)

  const dir = path.join(process.cwd(), 'public', 'data', 'games', language)
  // const dir = `./data/games/${language}`
  // console.log(`Listing game files in directory "${dir}"`)
  try {
    const files = await fs.readdir(dir)
    if (!files.length) {
      return null
    }
    const file = path.join(dir, _.max(files) ?? "")
    console.log(`Read games from file ${file}`);
    const data = await fs.readFile(file)
    let gameSetups = JSON.parse(data).map((props: Omit<GameSetup, "props">) => ({
      ...props,
      language: language
    })) as GameSetup[]

    if (filter) {
      gameSetups = gameSetups.filter(filter)
    }
    // console.log(`Choose game setup (out of ${gameSetups.length})`)
    const gameSetup = _.sample(gameSetups)
    if (!gameSetup) {
      return null
    }
    return gameSetup

  } catch (err) {
    return null
  }
}
