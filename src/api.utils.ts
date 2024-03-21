
import { NextRequest, NextResponse } from "next/server";
import { Session, Game } from "./db.types";
import { db } from "@/src/db";


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
