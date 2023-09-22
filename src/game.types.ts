
import _ from "lodash";
import { NextRouter } from "next/router";
// var path = require('path');
// var fs = require('fs');

export const autoRefreshInterval = 2000  // interval [ms] for auto refresh

export type FieldSettings = {  // also game-level, but passed to the Field component
  showNumSolutions: boolean;
  showNumSolutionsHint: boolean;
}
export type Settings = FieldSettings & {
  difficulty: DifficultyLevel;
  timeLimit: number | false;
}
const parseSetting = (k: keyof Settings, v: string): Settings[keyof Settings] | string => {
  if (k == "showNumSolutions" || k == "showNumSolutionsHint") {
    return v == "true"
  }
  if (k == "difficulty") {
    return v as DifficultyLevel
  }
  if (k == "timeLimit") {
    if (v == "false") {
      return false
    }
    return parseInt(v)
  }
  console.log(`Warning: No settings parse function defined for ${k}: "${v}"`)
  return v
}

export const defaultSettings: Settings = {
  difficulty: "easy",
  showNumSolutions: true,
  showNumSolutionsHint: false,
  timeLimit: 30,
}
export const settingsChanged = (oldSettings: Settings, newSettings: Settings): boolean => {
  return (Object.keys(oldSettings) as (keyof Settings)[]).some(k => oldSettings[k] != newSettings[k])
}

type BooleanSettingsKeys = {
  [K in keyof Settings]: Settings[K] extends boolean ? K : never;
}[keyof Settings];
type CamelCaseWithPrefix<T, Prefix extends string> = {
  [Key in keyof T as `${Prefix}${Capitalize<string & Key>}`]: T[Key];
};
type FilteredObject<T, U> = {
  [K in keyof T as K extends keyof U ? K : never]: T[K];
};
type RemoveSettingsPrefix<T> = {
  [K in keyof T as K extends `settings${infer U}` ? Uncapitalize<U> : K]: T[K];
};

export type PrefixedSettings = CamelCaseWithPrefix<Settings, "settings">

export const settingsToQuery = (settings: Partial<Settings>): Partial<PrefixedSettings> => {
  // return settings as PrefixedSettings
  return Object.fromEntries(Object.entries(settings).map(([k, v]) => [_.camelCase("settings" + k), v])) as Partial<PrefixedSettings>
}
export const settingsFromQuery = (query: Query): Partial<Settings> => {
  // return query as RemoveSettingsPrefix<FilteredObject<Query, PrefixedSettings>>
  return Object.fromEntries((Object.entries(query).filter(([k, v]) => k.startsWith("settings")) as [keyof Settings, any][]).map(([k, v]) => [
    k.charAt("settings".length).toLowerCase() + k.substring("settings".length + 1), v
  ]).map(([k, v]) => [k, parseSetting(k, v)])) as Partial<Settings>
  
}

export const getApiUrl = (query: ScalarQuery, { settings, router }: {
  settings?: Settings,
  router?: NextRouter
} = {}): string => {
  if (query.action == RequestAction.NewGame || query.action == RequestAction.ExistingOrNewGame) {
    if (settings && router) {
      query.difficulty = settings.difficulty
      query.language = query.language ?? (router.locale ?? defaultLanguage) as Language
    }
  }

  const search = Object.entries(query).filter(([key, val]) => val != undefined).map(([key, val]) => `${key}=${encodeURIComponent(val)}`).join("&")
  const url = "/api/game?" + search
  return url
}



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
  RefreshGame = 5,
  InitSessionFriend = 6,
  InitSessionRandom = 7,
  RefreshSession = 8,
  JoinSession = 9,
  InitSessionOffline = 10,
}

export type ScalarQuery = {
  userIdentifier: string;
  playingMode?: PlayingMode;
  invitationCode?: string;
  action: RequestAction;
  player?: number;
  countryId?: string;
  pos?: string;  // coords like "0,2"
  difficulty?: DifficultyLevel;
  language?: Language;
};
export type Query = ScalarQuery & Partial<PrefixedSettings>;
export type FrontendQuery = Omit<ScalarQuery, "userIdentifier" | "playingMode"> & { settings?: Settings }


export type GameSession = {
  index: number;
  isPublic: boolean;
  invitationCode?: string;
  playingMode: PlayingMode;
  currentGame: Game | null;
  previousGames: Game[];
  users: string[];
  score: number[];
  settings: Settings;
}
export type SessionWithoutGames = Omit<GameSession, "currentGame" | "previousGames">

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


export type DifficultyLevel = "easy" | "medium" | "hard"

export interface GameSetup {
  size: number;
  language: Language;
  solutions: Country["iso"][][][];
  alternativeSolutions: Country["iso"][][][];
  rows: CategoryValue[];
  cols: CategoryValue[];
  data: {
    difficultyLevel: DifficultyLevel;
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
  // isNewGame: boolean;
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

export type PlayerIndex = 0 | 1;
export type NoPlayer = -1;

export class Game {
  setup: GameSetup;
  users: string[];  // userIdentifiers. index: 0 ~ O/blue, 1 ~ X/red
  marking: (PlayerIndex | NoPlayer)[][];  // 0 ~ O/blue, 1 ~ X/red, -1 ~ [empty]
  guesses: (Country["iso"] | null)[][];
  turn: PlayerIndex;   // whose turn is it? 0/1
  playingMode: PlayingMode;
  state: GameState;
  winCoords: number[][] | null;  // coords of the winning formation
  winner: (PlayerIndex | NoPlayer) | null;
  turnCounter: number;
  turnStartTimestamp?: number;

  constructor(setup: GameSetup, users: string[], playingMode: PlayingMode, turn: PlayerIndex) {
    this.setup = setup
    this.users = users
    this.playingMode = playingMode
    this.marking = [...Array(setup.size)].map(x => [...Array(setup.size)].map(y => -1))
    this.guesses = [...Array(setup.size)].map(x => [...Array(setup.size)].map(y => null))
    this.turn = turn
    this.state = GameState.Running
    this.winner = null
    this.winCoords = null
    this.turnCounter = 0
  }

  static fromApi(data: GameProperties): Game {
    // need to call constructor to provide class methods
    const game = new Game(data.setup, data.users, data.playingMode, data.turn)
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

