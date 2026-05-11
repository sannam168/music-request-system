import { supabase } from "./supabase";

type Direction = "up" | "down";

async function getSettings() {
  const { data } = await supabase
    .from("settings")
    .select("*")
    .eq("id", 1)
    .single();

  if (
    data?.request_close_at &&
    data.is_request_open &&
    new Date(data.request_close_at).getTime() <= Date.now()
  ) {
    await supabase
      .from("settings")
      .update({
        is_request_open: false,
        request_close_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", 1);

    return {
      ...data,
      is_request_open: false,
      request_close_at: null,
    };
  }

  return data;
}

export async function getState() {
  const settings = await getSettings();

  const { data: currentSong } = await supabase
    .from("songs")
    .select("*")
    .eq("status", "playing")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  const { data: songs } = await supabase
    .from("songs")
    .select("*")
    .eq("status", "waiting")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  const { data: history } = await supabase
    .from("songs")
    .select("*")
    .in("status", ["played", "skipped", "deleted"])
    .order("played_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(20);

  return {
    currentSong,
    songs: songs ?? [],
    history: history ?? [],
    isRequestOpen: settings?.is_request_open ?? true,
    requestCloseAt: settings?.request_close_at ?? null,
    maxDurationSec: settings?.max_duration_sec ?? 600,
    bannedKeywords: settings?.banned_keywords ?? [],
    bannedChannels: settings?.banned_channels ?? [],
  };
}

export async function addSong(
  requester: string,
  song: string,
  title?: string,
  thumbnail?: string,
  channelTitle?: string,
  videoId?: string,
  durationSec?: number
) {
  const state = await getState();

  if (!state.isRequestOpen) {
    return { error: "현재 신청곡을 받고 있지 않습니다." };
  }

  const text = `${song} ${title ?? ""}`.toLowerCase();
  const channel = `${channelTitle ?? ""}`.toLowerCase();

  const bannedKeyword = state.bannedKeywords.find((word: string) =>
    text.includes(word.toLowerCase())
  );

  if (bannedKeyword) {
    return { error: `금지어가 포함된 신청곡입니다: ${bannedKeyword}` };
  }

  const bannedChannel = state.bannedChannels.find((word: string) =>
    channel.includes(word.toLowerCase())
  );

  if (bannedChannel) {
    return { error: `차단된 채널의 영상입니다: ${bannedChannel}` };
  }

  if (durationSec && durationSec > state.maxDurationSec) {
    return { error: "최대 재생 시간을 초과한 영상입니다." };
  }

  const { data: duplicated } = await supabase
    .from("songs")
    .select("id")
    .eq("song", song)
    .in("status", ["waiting", "playing"])
    .maybeSingle();

  if (duplicated) {
    return { error: "이미 신청된 곡입니다." };
  }

  const { data, error } = await supabase
    .from("songs")
    .insert({
      requester,
      song,
      title,
      thumbnail,
      channel_title: channelTitle,
      video_id: videoId,
      duration_sec: durationSec,
      status: "waiting",
      sort_order: Date.now(),
    })
    .select()
    .single();

  if (error) return { error: error.message };

  return data;
}

export async function deleteSong(id: number) {
  await supabase
    .from("songs")
    .update({
      status: "deleted",
      played_at: new Date().toISOString(),
    })
    .eq("id", id);

  return getState();
}

export async function resetAllSongs() {
  await supabase
    .from("songs")
    .update({
      status: "deleted",
      played_at: new Date().toISOString(),
    })
    .in("status", ["waiting", "playing"]);

  return getState();
}

export async function playNextSong() {
  await supabase
    .from("songs")
    .update({
      status: "played",
      played_at: new Date().toISOString(),
    })
    .eq("status", "playing");

  const { data: nextSong } = await supabase
    .from("songs")
    .select("*")
    .eq("status", "waiting")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!nextSong) return getState();

  await supabase
    .from("songs")
    .update({ status: "playing" })
    .eq("id", nextSong.id);

  return getState();
}

export async function playSongNow(id: number) {
  await supabase
    .from("songs")
    .update({
      status: "played",
      played_at: new Date().toISOString(),
    })
    .eq("status", "playing");

  await supabase
    .from("songs")
    .update({ status: "playing" })
    .eq("id", id);

  return getState();
}

export async function skipSong() {
  await supabase
    .from("songs")
    .update({
      status: "skipped",
      played_at: new Date().toISOString(),
    })
    .eq("status", "playing");

  return playNextSong();
}

export async function toggleRequest() {
  const state = await getState();
  const nextValue = !state.isRequestOpen;

  await supabase
    .from("settings")
    .update({
      is_request_open: nextValue,
      request_close_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1);

  return nextValue;
}

export async function setCloseTimer(minutes: number | null) {
  const closeAt = minutes
    ? new Date(Date.now() + minutes * 60 * 1000).toISOString()
    : null;

  await supabase
    .from("settings")
    .update({
      request_close_at: closeAt,
      is_request_open: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1);

  return getState();
}

export async function updateSettings(
  maxDurationSec: number,
  bannedKeywords: string[],
  bannedChannels: string[]
) {
  await supabase
    .from("settings")
    .update({
      max_duration_sec: maxDurationSec,
      banned_keywords: bannedKeywords,
      banned_channels: bannedChannels,
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1);

  return getState();
}

export async function moveSong(id: number, direction: Direction) {
  const { data: songs } = await supabase
    .from("songs")
    .select("*")
    .eq("status", "waiting")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (!songs) return getState();

  const index = songs.findIndex((song) => song.id === id);
  const targetIndex = direction === "up" ? index - 1 : index + 1;

  if (index === -1 || targetIndex < 0 || targetIndex >= songs.length) {
    return getState();
  }

  const current = songs[index];
  const target = songs[targetIndex];

  await supabase
    .from("songs")
    .update({ sort_order: target.sort_order })
    .eq("id", current.id);

  await supabase
    .from("songs")
    .update({ sort_order: current.sort_order })
    .eq("id", target.id);

  return getState();
}

export async function reorderSongs(ids: number[]) {
  await Promise.all(
    ids.map((id, index) =>
      supabase
        .from("songs")
        .update({ sort_order: index + 1 })
        .eq("id", id)
    )
  );

  return getState();
}