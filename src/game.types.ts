
import { Game as DbGame, Session } from "@/src/db.types";
import { GameState, PlayingMode, User } from "@prisma/client";
import _ from "lodash";
import { NextRouter } from "next/router";

export const autoRefreshInterval = 1500  // interval [ms] for auto refresh

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

// export const settingsToQuery = (settings: Partial<Settings>): Partial<PrefixedSettings> => {
//   // return settings as PrefixedSettings
//   // return Object.fromEntries(Object.entries(settings).map(([k, v]) => [_.camelCase("settings" + k), v])) as Partial<PrefixedSettings>
// }
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
  if (query.action == "NewGame" || query.action == "ExistingOrNewGame") {
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

export type RequestAction = "ExistingOrNewGame" |
  "NewGame" |
  "MakeGuess" |
  "EndTurn" |
  "EndGame" |
  "TimeElapsed" |
  "RefreshSession" |
  "PlayOn" |
  "InitSessionFriend" |
  "InitSessionRandom" |
  "RefreshSession" |
  "JoinSession" |
  "InitSessionOffline"

export function isIngameAction(action: RequestAction) {
  return action == "MakeGuess" || action == "EndTurn" || action == "TimeElapsed" || action == "RefreshSession" || action == "EndGame"
}
export function isGameInitAction(action: RequestAction) {
  return action == "NewGame" || action == "ExistingOrNewGame"
}
export function isSessionInitAction(action: RequestAction) {
  return action == "JoinSession" || action == "InitSessionFriend" || action == "InitSessionRandom" || action == "RefreshSession" || action == "InitSessionOffline"
}


export type ApiResponse = {
  session: Session
  game: DbGame
  user?: User
  countries?: Country[]
} | {
  error: string
}
export type ApiHandler = (url: string, query: FrontendQuery) => any

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

export type ApiQuery = {
  action: RequestAction
  settings?: Settings
}

export type ApiBody = ApiQuery & {
  user: User["id"]
  turn?: number  // turnCounter
}

export type GameSession = {
  index: number
  id: string
  isPublic: boolean
  invitationCode?: string
  playingMode: PlayingMode
  currentGame: Game | null
  previousGames: Game[]
  users: string[]
  score: number[]
  settings: Settings
}
export type SessionWithoutGames = Omit<GameSession, "currentGame" | "previousGames">

export interface Country {
  iso: string;
  name: string;
  capital: string;
  continent: string;
  flagColors: string[];
  neighbors: string[];
  island: boolean;
  landlocked: boolean;
  population: number;
  areaKm2: number;
  maxElev: number;
  maxElevName: string;
  minElev?: number;
  minElevName?: string;
  alternativeValues: {
    name?: string[];
    capital?: string[];
    continent?: string[];
    flagColors?: string[];
    neighbors?: string[];
    island?: boolean;
    landlocked?: boolean;
    // [x: string]: any[];
  }
  [x: string]: any;
}

export type Category = {
  key: string,
  name: string,
  columnDependencies: string[],
  difficulty: number,
  type: "NominalCategory" | "MultiNominalCategory" | "SimpleBooleanCategory" | "TopNCategory" | "BottomNCategory" | "GreaterThanCategory" | "LessThanCategory",
  usesAlternativeValues: boolean,
  isBooleanCategory: boolean,
  isNominalCategory: boolean,
  isMultiNominalCategory: boolean
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
// export enum GameState {
//   Initialized = 0,
//   Running = 1,
//   Decided = 2,  // set as soon as a winner / draw is determined but the board is not full yet (might continue playing)
//   Finished = 3,  // only set if the board is fully marked
//   Ended = 4  // After having clicked "End game", then show solutions
// }

export type GameData = {
  // isNewGame: boolean;
  game: Game | null;
}

type GamePropertyKeys = keyof Game;
type GameProperties = {
  [K in GamePropertyKeys]: Game[K];
};

export type PlayerIndex = 0 | 1;
export type NoPlayer = -1;

export class Game {
  id: number
  session: Session
  setup: GameSetup;
  language: Language;
  users: User[];  // index: 0 ~ O/blue, 1 ~ X/red
  marking: (PlayerIndex | NoPlayer)[][];  // 0 ~ O/blue, 1 ~ X/red, -1 ~ [empty]
  guesses: (Country["iso"] | null)[][];
  turn: PlayerIndex;   // whose turn is it? 0/1
  playingMode: PlayingMode;
  state: GameState;
  winCoords: number[][] | null;  // coords of the winning formation
  winner: (PlayerIndex | NoPlayer) | null;
  turnCounter: number;
  turnStartTimestamp: Date
  createdAt: Date
  finishedAt: Date | null

  /**
   * Creates a Game instance from db input
   */
  constructor(game: DbGame, session: Session) {
    this.id = game.id
    this.session = session
    this.setup = JSON.parse(game.setup)
    this.language = this.setup.language as Language
    this.users = session.users
    this.playingMode = session.playingMode

    this.marking = [...Array(this.setup.size)].map(x => [...Array(this.setup.size)].map(y => -1))
    this.guesses = [...Array(this.setup.size)].map(x => [...Array(this.setup.size)].map(y => null))
    game.markings.forEach(m => {
      const { i, j } = this.getIJ(m.x, m.y)
      this.marking[i][j] = m.player as PlayerIndex
      this.guesses[i][j] = m.value
    })
    this.turn = game.turn as PlayerIndex
    this.state = game.state
    this.winCoords = game.markings.filter(m => m.isWinning).map(m => [m.x, m.y])
    this.winner = game.winner as (PlayerIndex | NoPlayer) | null
    this.turnCounter = game.turnCounter

    this.turnStartTimestamp = new Date(game.turnStartTimestamp)
    this.createdAt = new Date(game.createdAt)
    this.finishedAt = game.finishedAt ? new Date(game.finishedAt) : null
  }

  isRunning() {
    return this.state == GameState.Initialized || this.state == GameState.Running || this.state == GameState.PlayingOn
  }

  isDecided() {
    return this.state == GameState.Decided || this.state == GameState.PlayingOn || this.state == GameState.Finished || this.state == GameState.Ended
  }

  hasEnded() {
    return this.state == GameState.Finished || this.state == GameState.Ended
  }

  isValidGuess(x: number, y: number, country: Country) {
    const { i, j } = this.getIJ(x, y)
    return this.setup.solutions[i][j].concat(this.setup.alternativeSolutions[i][j]).includes(country.iso)
  }

  getIJ(x: number, y: number) {
    return { i: this.setup.size - y, j: x - 1 }
  }

  getXY(i: number, j: number) {
    return { x: j + 1, y: this.setup.size - i }
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
