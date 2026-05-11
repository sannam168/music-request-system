import { NextResponse } from "next/server";

import {
  addSong,
  deleteSong,
  getLikes,
  getState,
  moveSong,
  playNextSong,
  playSongNow,
  reorderSongs,
  resetAllSongs,
  setCloseTimer,
  skipSong,
  toggleLike,
  toggleRequest,
  updateSettings,
} from "@/lib/songStore";

export async function GET() {
  const state = await getState();
  const likes = await getLikes();

  return NextResponse.json({
    ...state,
    likes,
  });
}

export async function POST(request: Request) {
  const body = await request.json();

  if (body.action === "add") {
    return NextResponse.json(
      await addSong(
        body.requester,
        body.song,
        body.title,
        body.thumbnail,
        body.channelTitle,
        body.videoId,
        body.durationSec
      )
    );
  }

  if (body.action === "delete") {
    return NextResponse.json(await deleteSong(body.id));
  }

  if (body.action === "reset") {
    return NextResponse.json(await resetAllSongs());
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

  if (body.action === "closeTimer") {
    return NextResponse.json(await setCloseTimer(body.minutes));
  }

  if (body.action === "settings") {
    return NextResponse.json(
      await updateSettings(
        body.maxDurationSec,
        body.bannedKeywords ?? [],
        body.bannedChannels ?? []
      )
    );
  }

  if (body.action === "move") {
    return NextResponse.json(await moveSong(body.id, body.direction));
  }

  if (body.action === "reorder") {
    return NextResponse.json(await reorderSongs(body.ids));
  }

if (body.action === "like") {
  return NextResponse.json(
    await toggleLike(body.songId, body.userKey)
  );
}

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}