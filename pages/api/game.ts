
import { Game, GameSetup, Country, gameSetups, countries, randomChoice, RequestAction, Query, PlayingMode } from "@/src/game.types"


var gameUserMap: {[x: string]: Game} = {}

// TODO fix userId

function makeGuess(game: Game, { userIdentifier, playerIndex, countryId, pos }: Query) {
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
  const userIndex = game.users.indexOf(userIdentifier)
  if (![0, 1].includes(userIndex)) {
    console.log(`Error: User identifier not found!`);
    return false
  }
  if (game.turn != playerIndex) {
    console.log(`Error: It's not player ${playerIndex}'s turn!`);
    return false
  }

  // check correct solution
  if (!game.isValidGuess(i, j, country)) {
    console.log(`Error: Wrong guess ((${i},${j}), ${country.name})`)
    game.turn = 1 - game.turn
    return true  // might return false?
  }

  // execute
  game.marking[i][j] = playerIndex
  game.guesses[i][j] = country.iso
  game.turn = 1 - game.turn
  console.log(`Set (${i},${j}) to ${country.iso} (player ${playerIndex} / user ${userIndex} / ${userIdentifier})`);

  // check win
  // TODO

  return true

}

function endTurn(game: Game, { userIdentifier, playerIndex }: Query) {
  if (game.turn != playerIndex) {
    console.log(`Error: It's not player ${playerIndex}'s turn!`);
    return false
  }
  game.turn = 1 - game.turn
  return true
}

function chooseGame(gameSetups: GameSetup[]): GameSetup {
  gameSetups = gameSetups.filter(setup => {
    const labels = setup.labels.rows.concat(setup.labels.cols)
    if (labels.includes("Island Nation") || labels.includes("Landlocked")) {
      return true
    }
    return false
  })
  return randomChoice(gameSetups)
}

export default (req, res) => {

  const { userIdentifier, action, playerIndex, countryId, pos }: Query = req.query;

  // get the Game instance, or create a new one
  let game: Game | null = gameUserMap[userIdentifier]
  console.log(`userIdentifier ${userIdentifier}: ` + (game ? "Found game." : "No game found.") + " All games: " + JSON.stringify(Object.entries(gameUserMap).map(([k, v]) => k)))
  if (action == RequestAction.NewGame) {
    game = null
  }
  const isNewGame = !game;
  if (!game) {
    game = new Game(
      chooseGame(gameSetups),
      [userIdentifier],  // 1 element for offline game
      PlayingMode.Offline
    )
    gameUserMap[userIdentifier] = game
  }

  // actions
  let result = false

  if (action == RequestAction.ExistingOrNewGame || action == RequestAction.NewGame) {
    result = !!game
  }

  if (action == RequestAction.MakeGuess && playerIndex && countryId && pos) {
    result = makeGuess(game, req.query)
  }
  
  if (action == RequestAction.EndTurn && playerIndex) {
    result = endTurn(game, req.query)
  }

  console.log(`${RequestAction[action]}: ${result ? "successful" : "not successful"}`);


  res.status(200).json({ isNewGame: isNewGame, game: game });

};

