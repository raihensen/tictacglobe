
import { Game, GameSetup, Country, gameSetups, countries, randomChoice, RequestAction } from "../../src/game.types"


const gameUserMap: {[x: string]: Game} = {}

type Query = {
  userIdentifier: string;
  action: RequestAction;
}

// TODO post game actions to server

export default (req, res) => {

  const { userIdentifier, action }: Query = req.query;

  let game: Game | null = gameUserMap[userIdentifier]
  if (action == RequestAction.NewGame) {
    game = null
  }
  const isNewGame = !game;
  if (!game) {
    game = new Game(randomChoice(gameSetups), [userIdentifier, ""])
    gameUserMap[userIdentifier] = game
  }

  res.status(200).json({ isNewGame: isNewGame, game: game });

};

