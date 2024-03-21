import { create } from "zustand";
import _ from "lodash";
import { DispatchSetStateActionStateSetters, withSetters, createSelectors, createStateSelectors } from "./zustand.util";
import { User } from "@prisma/client";
import { Session } from "./db.types";
import { Game } from "./game.types";

export type State = {
  // General
  user: User | null
  session: Session | null
  game: Game | null

}

export type Action = DispatchSetStateActionStateSetters<State>
type Store = State & Action


const useTtgStoreBase = create<Store>((set) => withSetters<State, Action>(set, {
  // General
  user: null,
  session: null,
  game: null
}))


export const useTtgStore = createStateSelectors(createSelectors(useTtgStoreBase))

// const \[(.*), set.*\: (.*) \| undefined>\(\)
// const \[(.*), set.*\: (.*[])>\(\)
