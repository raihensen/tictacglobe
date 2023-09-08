
var _ = require('lodash');
// var path = require('path');
// var fs = require('fs');


export enum Language {
  German = "de",
  English = "en"
}

export const defaultLanguage = Language.English

export enum RequestAction {
  ExistingOrNewGame = 0,
  NewGame = 1,
  MakeGuess = 2,
  EndTurn = 3,
  TimeElapsed = 4,
}

export type Query = {
  userIdentifier: string;
  action: RequestAction;
  player?: number;
  countryId?: string;
  pos?: string;  // coords like "0,2"
  difficulty?: "easy" | "medium" | "hard";
  language?: Language;
}


export interface Country {
  iso: string;
  name: string;
  capital: string;
  continent: string;
  flagColors: string[];
  neighbors: string[];
  alternativeValues: {
    name?: string[];
    capital?: string[];
    continent?: string[];
    flagColors?: string[];
    neighbors?: string[];
    // [x: string]: any[];
  }
  [x: string]: any;
}

export type CategoryValue = {
  category: string;
  value: any;
}

// TODO convert to this enum
export enum DifficultyLevel {
  Easy = 0,
  Medium = 1,
  Hard = 2
}

export interface GameSetup {
  size: number;
  language: Language;
  solutions: Country["iso"][][][];
  alternativeSolutions: Country["iso"][][][];
  rows: CategoryValue[];
  cols: CategoryValue[];
  data: {
    difficultyLevel: string;
    avgCellDifficulty: number;
    maxCellDifficulty: number;
    [x: string]: any;
  }
}
export enum GameState {
  Initialized = 0,
  Running = 1,
  Decided = 2,  // set as soon as a winner / draw is determined but the board is not full yet (might continue playing)
  Finished = 3  // only set if the board is fully marked
}

export type GameData = {
  isNewGame: boolean;
  game: Game | null;
}

export enum PlayingMode {
  Offline = 0,
  Online = 1
}

type GamePropertyKeys = keyof Game;
type GameProperties = {
  [K in GamePropertyKeys]: Game[K];
};

export class Game {
  setup: GameSetup;
  users: string[];  // userIdentifiers. index: 0 ~ O/blue, 1 ~ X/red
  marking: number[][];  // 0 ~ O/blue, 1 ~ X/red, -1 ~ [empty]
  guesses: (Country["iso"] | null)[][];
  turn: number;
  playingMode: PlayingMode;
  state: GameState;
  winCoords: number[][] | null;  // coords of the winning formation
  winner: number | null;

  constructor(setup: GameSetup, users: string[], playingMode: PlayingMode) {
    this.setup = setup
    this.users = users
    this.playingMode = playingMode
    this.marking = [...Array(setup.size)].map(x => [...Array(setup.size)].map(y => -1))
    this.guesses = [...Array(setup.size)].map(x => [...Array(setup.size)].map(y => null))
    this.turn = 0
    this.state = GameState.Running
    this.winner = null
    this.winCoords = null
  }

  static fromApi(data: GameProperties): Game {
    // need to call constructor to provide class methods
    const game = new Game(data.setup, data.users, data.playingMode)
    Object.entries(data).forEach(([k, v]) => {
      (game as any)[k as keyof GameProperties] = v
    })
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

export const parseCountry = (c: any) => {
  const country = Object.fromEntries(Object.entries(c).filter(([k, v]) => !k.endsWith("_alt")).map(
    ([k, v]) => [_.camelCase(k), v]
  ).concat([["alternativeValues", {}]])
  ) as Country
  country.alternativeValues = Object.fromEntries(Object.entries(c).filter(([k, v]) => k.endsWith("_alt") && (v as any[]).length).map(
    ([k, v]) => [_.camelCase(k.substring(0, k.length - 4)), v]
  ))
  return country
}

