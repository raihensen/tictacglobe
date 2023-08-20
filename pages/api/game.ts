
import { Game, GameSetup, Country, gameSetups, countries, randomChoice, RequestAction, Query } from "../../src/game.types"


const gameUserMap: {[x: string]: Game} = {}

// TODO fix userId

function makeGuess(game: Game, { userIdentifier, action, countryId, pos }: Query) {
  const match = (pos as string).match(/^(\d+),(\d+)$/)
  if (!match) {
    console.log(`Error: Invalid pos argument`);
    return false
  }
  const [i, j] = [parseInt(match[1]), parseInt(match[2])]
  if (i < 0 || i >= game.setup.size || j < 0 || j >= game.setup.size) {
    console.log(`Error: Invalid pos argument`);
    return false
  }
  const country = countries.find(c => c.iso == countryId)
  if (!country) {
    console.log(`Error: Country "${countryId}" not found!`);
    return false
  }
  if (game.marking[i][j] != -1 || game.guesses[i][j]) {
    console.log(`Error: Cell (${i},${j}) already occupied!`);
    return false
  }

  // execute
  const userIndex = game.users.indexOf(userIdentifier)
  game.marking[i][j] = userIndex
  game.guesses[i][j] = country.iso
  console.log(`Set (${i},${j}) to ${country.iso} (user ${userIndex} / ${userIdentifier})`);
  
  if (!game.numMoves) {
    game.numMoves = 0
  }
  game.numMoves += 1

  // check win
  // TODO

  return true

}

export default (req, res) => {

  const { userIdentifier, action, countryId, pos }: Query = req.query;

  // get the Game instance, or create a new one
  let game: Game | null = gameUserMap[userIdentifier]
  if (action == RequestAction.NewGame) {
    game = null
  }
  const isNewGame = !game;
  if (!game) {
    game = new Game(randomChoice(gameSetups), [userIdentifier, ""])
    gameUserMap[userIdentifier] = game
  }

  // actions
  if (action == RequestAction.MakeGuess && countryId && pos) {
    const result = makeGuess(game, req.query)
    console.log(`makeGuess: ${result ? "successful" : "not successful"}`);
    
  }


  res.status(200).json({ isNewGame: isNewGame, game: game });

};

