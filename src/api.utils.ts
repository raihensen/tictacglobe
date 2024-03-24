
import { NextRequest, NextResponse } from "next/server";
import { Session, Game } from "./db.types";
import { db } from "@/src/db";
import _ from "lodash";
import { GameState, Prisma } from "@prisma/client";
import { DefaultArgs } from "@prisma/client/runtime/library";


export function error(msg: string, status: number = 400) {

  return NextResponse.json({
    error: msg,
    success: false
  }, {
    status: status
  })
}

export async function switchTurnsAndUpdateState(game: Game, state: GameState, changeUpdatedAt: boolean) {
  const currentTimestamp = new Date()
  const switchTurns = state != GameState.Finished && state != GameState.Ended
  return db.game.update({
    where: {
      id: game.id
    },
    data: {
      ...(switchTurns ? {
        turn: 1 - game.turn,
        turnCounter: {
          increment: 1
        },
        turnStartTimestamp: currentTimestamp,
      } : {}),
      updatedAt: changeUpdatedAt ? currentTimestamp : undefined,
      state: state
    },
    include: gameIncludeIngameData
  })
}

export const gameIncludeIngameData = {
  markings: true,
  session: {
    include: {
      users: true
    }
  }
}

export async function joinSession(sessionId: number, name?: string) {
  const user = await db.user.create({
    data: {
      name: name
    }
  })
  const session = await db.session.update({
    where: { id: sessionId },
    data: {
      isFull: true,
      users: {
        connect: {
          id: user.id
        }
      }
    },
    include: sessionIncludeCurrentGame
  })
  return { session, user }
}

export async function findSessionWithCurrentGame(sessionId: number) {
  return db.session.findFirst({
    where: {
      id: sessionId
    },
    include: sessionIncludeCurrentGame
  })
}

export const sessionIncludeCurrentGame: Prisma.SessionInclude<DefaultArgs> = {
  games: {
    orderBy: {
      createdAt: "desc",
    },
    take: 1,
    include: {
      markings: true
    }
  },
  users: true
}

export function generateInvitationCode(length: number = 4) {
  const characters = 'ABCDEFGHJKLPQRSTUVWXYZ456789'
  return _.range(4).map(() => characters.charAt(Math.floor(Math.random() * characters.length))).join("")
}

export function invitationCodeAlive() {
  return {
    createdAt: {
      gte: new Date(Date.now() - 30 * 86400000)  // max 30 days old
      // state: { not: SessionState.CLOSED }
    }
  }
}
