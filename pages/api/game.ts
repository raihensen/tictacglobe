
import { Game, GameSetup, Country, gameSetups, countries, randomChoice } from "../../src/game.types"


const gameUserMap: {[x: string]: Game} = {}

type Query = {
  userIdentifier: string;
}


export default (req, res) => {

  const { userIdentifier }: Query = req.query;
  let game = gameUserMap[userIdentifier]
  const isNewGame = !game;
  if (!game) {
    game = new Game(randomChoice(gameSetups), [userIdentifier, ""])
    gameUserMap[userIdentifier] = game
  }

  // Your game session logic based on the user identifier
  // Example: Check if a game session with this identifier already exists

  // Simulate creating a new game if userIdentifier is empty
  

  res.status(200).json({ isNewGame: isNewGame, game: game });

};

