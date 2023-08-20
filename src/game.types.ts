
export enum RequestAction {
  ExistingOrNewGame = 0,
  NewGame = 1,
  MakeGuess = 2
}

export type Query = {
  userIdentifier: string;
  action: RequestAction;
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

export class Game {
  setup: GameSetup;
  users: string[];  // index 0 = O, 1 = X
  marking: number[][];  // 0 = O, 1 = X, -1 = empty
  guesses: (Country["iso"] | null)[][];

  numMoves?: number;

  constructor(setup: GameSetup, users: string[]) {
    this.setup = setup
    this.users = users
    this.marking = [...Array(setup.size)].map(x => [...Array(setup.size)].map(y => -1))
    this.guesses = [...Array(setup.size)].map(x => [...Array(setup.size)].map(y => null))
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

export function randomChoice<T>(arr: Array<T>): T {
  return arr[Math.floor(arr.length * Math.random())];
}

export function getCountry(q: string): Country | null {
  return countries.find(c => c.iso == q || c.name == q) || null
}

import countryData from '../data/countries.json'
import gameData from '../data/games1.json'

export const countries = countryData as Country[]
export const gameSetups = gameData as GameSetup[]

