
import { db } from "@/src/db";
import { Prisma, Session, User } from "@prisma/client";
import { DefaultArgs } from "@prisma/client/runtime/library";
import _ from "lodash";
import { NextResponse } from "next/server";


export function error(msg: string, status: number = 400) {

  return NextResponse.json({
    error: msg,
    success: false
  }, {
    status: status
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

export async function joinSession(session: Session, user: User, name?: string, color?: string) {
  const userIndex = session.isFull ? 1 : 0
  // const user = await db.user.create({
  //   data: {
  //     name: name,
  //     color: color,
  //   }
  // })
  session = await db.session.update({
    where: { id: session.id },
    data: {
      isFull: true,
      users: {
        connect: { id: user.id }
      },
      ...(userIndex == 0 ? { color1: color } : { color2: color }),
    },
    include: sessionIncludeCurrentGame
  })
  return { session }
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
