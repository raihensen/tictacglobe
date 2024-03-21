
import { NextRequest, NextResponse } from "next/server";
import { Session, Game } from "./db.types";
import { db } from "@/src/db";
import _ from "lodash";
import { Prisma } from "@prisma/client";
import { DefaultArgs } from "@prisma/client/runtime/library";


export function error(msg: string, status: number = 400) {

  return NextResponse.json({
    error: msg,
    success: false
  }, {
    status: status
  })
}

export function respond(session: Session, game?: Game) {

  return NextResponse.json({
    success: true,
    session,
    game
  })

}

export async function joinSession(sessionId: number, name?: string) {
  return db.session.update({
    where: { id: sessionId },
    data: {
      isFull: true,
      users: {
        create: {
          name: name
        }
      }
    },
    include: sessionIncludeCurrentGame
  })
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
