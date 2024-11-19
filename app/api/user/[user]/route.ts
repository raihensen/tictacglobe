import { error } from "@/src/api.utils";
import { db } from "@/src/db";
import { NextRequest, NextResponse } from "next/server";


export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ user: string }> }
) {

  const { user: userId } = await params
  if (!userId) return error("Invalid request")

  const user = await db.user.findUnique({
    where: {
      id: userId
    }
  })
  if (!user) return error("User not found", 404)

  return NextResponse.json({
    user: user,
    success: true
  })

}

