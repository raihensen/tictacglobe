
export enum RequestAction {
  ExistingOrNewGame = 0,
  NewGame = 1,
  MakeGuess = 2,
  EndTurn = 3
}

export type Query = {
  userIdentifier: string;
  action: RequestAction;
  playerIndex?: number;
  countryId?: string;
  pos?: string;  // coords like "0,2"
}


export interface Country {
  iso: string;
  name: string;
  capital: string;
  continent: string;
  [x: string]: any;
}

export interface GameSetup {
  size: number;
  solutions: Country["iso"][][][];
  alternativeSolutions: Country["iso"][][][];
  labels: {
    rows: string[];
    cols: string[];
  }
}
export enum GameState {
  Initialized = 0,
  Running = 1,
  Finished = 2
}

export type GameData = {
  isNewGame: boolean;
  game: Game | null;
}

export enum PlayingMode {
  Offline = 0,
  Online = 1
}

export class Game {
  setup: GameSetup;
  users: string[];  // index 0 = O, 1 = X
  marking: number[][];  // 0 = O, 1 = X, -1 = empty
  guesses: (Country["iso"] | null)[][];
  turn: number;
  playingMode: PlayingMode;
  state: GameState;

  constructor(setup: GameSetup, users: string[], playingMode: PlayingMode) {
    this.setup = setup
    this.users = users
    this.playingMode = playingMode
    this.marking = [...Array(setup.size)].map(x => [...Array(setup.size)].map(y => -1))
    this.guesses = [...Array(setup.size)].map(x => [...Array(setup.size)].map(y => null))
    this.turn = 0
    this.state = GameState.Running
  }

  static fromApi(data: Game): Game {
    const game = new Game(data.setup, data.users, data.playingMode)
    game.marking = data.marking
    game.guesses = data.guesses
    game.turn = data.turn
    return game
  }

  isValidGuess(i: number, j: number, country: Country) {
    return this.setup.solutions[i][j].concat(this.setup.alternativeSolutions[i][j]).includes(country.iso)
  }

}

export function range(startOrLength: number, stop: number | null = null): number[] {
  let start = startOrLength
  if (stop === null) {
    start = 0
    stop = startOrLength
  }
  return Array(stop - start).map((_, i) => start + i)
}

export function getCountry(q: string): Country | null {
  return countries.find(c => c.iso == q || c.name == q) || null
}

import countryData from '../data/countries.json'
import gameData from '../data/games-2-more-categories.json'

export const countries = countryData as Country[]
export const gameSetups = gameData as GameSetup[]

