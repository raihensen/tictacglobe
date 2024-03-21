import { Prisma } from "@prisma/client"


const sessionWithCurrentGame = Prisma.validator<Prisma.SessionDefaultArgs>()({
  include: {
    games: {
      include: {
        markings: true
      },
      take: 1
    }
  },
})
const gameWithMarkings = Prisma.validator<Prisma.GameDefaultArgs>()({
  include: { markings: true },
})

export type Session = Prisma.SessionGetPayload<typeof sessionWithCurrentGame>
export type Game = Prisma.GameGetPayload<typeof gameWithMarkings>
