import { db } from "@/src/db";
import { NextRequest, NextResponse } from "next/server";


export async function POST(
  req: NextRequest
) {
  // need POST also to avoid caching

  const user = await db.user.create({
    data: {
    },
  })

  return NextResponse.json({
    user: user,
    success: true
  })

}
