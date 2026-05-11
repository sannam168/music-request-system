import { NextResponse } from "next/server";

import {
  addSong,
  deleteSong,
  getState,
  moveSong,
  playNextSong,
  playSongNow,
  skipSong,
  toggleRequest,
} from "@/lib/songStore";

export async function GET() {
  const state = await getState();
  return NextResponse.json(state);
}

export async function POST(request: Request) {
  const body = await request.json();

  if (body.action === "add") {
    const song = await addSong(
      body.requester,
      body.song,
      body.title,
      body.thumbnail,
      body.channelTitle,
      body.videoId
    );

    return NextResponse.json(song);
  }

  if (body.action === "delete") {
    return NextResponse.json(await deleteSong(body.id));
  }

  if (body.action === "next") {
    return NextResponse.json(await playNextSong());
  }

  if (body.action === "playNow") {
    return NextResponse.json(await playSongNow(body.id));
  }

  if (body.action === "skip") {
    return NextResponse.json(await skipSong());
  }

  if (body.action === "toggleRequest") {
    return NextResponse.json({
      isRequestOpen: await toggleRequest(),
    });
  }

  if (body.action === "move") {
    return NextResponse.json(await moveSong(body.id, body.direction));
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}