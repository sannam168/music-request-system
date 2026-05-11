import { supabase } from "./supabase";

export async function getState() {
  const { data: settings } = await supabase
    .from("settings")
    .select("is_request_open")
    .eq("id", 1)
    .single();

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

  return {
    currentSong,
    songs: songs ?? [],
    isRequestOpen: settings?.is_request_open ?? true,
  };
}

export async function addSong(
  requester: string,
  song: string,
  title?: string,
  thumbnail?: string,
  channelTitle?: string,
  videoId?: string
) {
  const state = await getState();

  if (!state.isRequestOpen) {
    return { error: "현재 신청곡을 받고 있지 않습니다." };
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

  const sortOrder = Date.now();

  const { data, error } = await supabase
    .from("songs")
    .insert({
      requester,
      song,
      title,
      thumbnail,
      channel_title: channelTitle,
      video_id: videoId,
      status: "waiting",
      sort_order: sortOrder,
    })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  return data;
}

export async function deleteSong(id: number) {
  await supabase.from("songs").update({ status: "deleted" }).eq("id", id);

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

  if (!nextSong) {
    return getState();
  }

  await supabase.from("songs").update({ status: "playing" }).eq("id", nextSong.id);

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

  await supabase.from("songs").update({ status: "playing" }).eq("id", id);

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
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1);

  return nextValue;
}

export async function moveSong(id: number, direction: "up" | "down") {
  const { data: songs } = await supabase
    .from("songs")
    .select("*")
    .eq("status", "waiting")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (!songs) return getState();

  const index = songs.findIndex((song) => song.id === id);
  if (index === -1) return getState();

  const targetIndex = direction === "up" ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= songs.length) return getState();

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