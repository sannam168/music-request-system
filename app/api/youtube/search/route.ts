import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");

  if (!q) {
    return NextResponse.json({ error: "검색어가 없습니다." }, { status: 400 });
  }

  const apiKey = process.env.YOUTUBE_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: "YOUTUBE_API_KEY가 없습니다." }, { status: 500 });
  }

  const url =
    `https://www.googleapis.com/youtube/v3/search` +
    `?part=snippet` +
    `&type=video` +
    `&maxResults=5` +
    `&q=${encodeURIComponent(q)}` +
    `&key=${apiKey}`;

  const res = await fetch(url);
  const data = await res.json();

  const results = data.items.map((item: any) => ({
    videoId: item.id.videoId,
    title: item.snippet.title,
    channelTitle: item.snippet.channelTitle,
    thumbnail: item.snippet.thumbnails.medium.url,
    url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
  }));

  return NextResponse.json(results);
}