import { initialPageState, PageState } from "@/components/Layout";
import { User } from "@prisma/client";
import { create } from "zustand";
import { Session } from "./db.types";
import { Category, Country, Game } from "./game.types";
import { createSelectors, createStateSelectors, DispatchSetStateActionStateSetters, withSetters } from "./zustand.util";

export type State = {
  // General
  user: User | null
  session: Session | null
  game: Game | null
  countries: Country[] | null
  categories: Category[] | null
  latency: number

} & PageState

export type Action = DispatchSetStateActionStateSetters<State>
type Store = State & Action


const useTtgStoreBase = create<Store>((set) => withSetters<State, Action>(set, {
  // General
  user: null,
  session: null,
  game: null,
  countries: null,
  categories: null,
  latency: 20,
  ...initialPageState,
}))


export const useTtgStore = createStateSelectors(createSelectors(useTtgStoreBase))

// const \[(.*), set.*\: (.*) \| undefined>\(\)
// const \[(.*), set.*\: (.*[])>\(\)
