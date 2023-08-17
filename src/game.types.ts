
export enum RequestAction {
  ExistingOrNewGame = 0,
  NewGame = 1
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
  values: Country[];
  cells: Country["iso"][][][];
  labels: {
    rows: string[];
    cols: string[];
  }
}

export class Game {
  setup: GameSetup;
  users: string[];  // index 0 = O, 1 = X
  marking: number[][];  // 0 = O, 1 = X, -1 = empty

  constructor(setup: GameSetup, users: string[]) {
    this.setup = setup
    this.users = users
    this.marking = Array(setup.size).map(x => Array(setup.size).map(y => 2))
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

import countryData from '../data/local/countries_processed.json'
import gameData from '../data/games.json'

export const countries: Country[] = countryData.map(x => ({ iso: x.ISO, name: x.Country, capital: x.Capital, continent: x.Continent }) as Country)
export const gameSetups = gameData as GameSetup[]

