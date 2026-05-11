"use client";

import { useEffect, useMemo, useState } from "react";

type SongRequest = {
  id: number;
  requester: string;
  song: string;
  title?: string;
  thumbnail?: string;
  channel_title?: string;
  duration_sec?: number;
};

function getYoutubeId(text: string) {
  const patterns = [
    /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1];
  }

  return null;
}

function getTitle(song: SongRequest) {
  return song.title || song.song;
}

function getThumbnail(song: SongRequest) {
  if (song.thumbnail) return song.thumbnail;

  const videoId = getYoutubeId(song.song);
  if (!videoId) return null;

  return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
}

function formatDuration(sec?: number) {
  if (!sec) return "-";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function AdminPage() {
  const [songs, setSongs] = useState<SongRequest[]>([]);
  const [history, setHistory] = useState<SongRequest[]>([]);
  const [currentSong, setCurrentSong] = useState<SongRequest | null>(null);
  const [isRequestOpen, setIsRequestOpen] = useState(true);
  const [requestCloseAt, setRequestCloseAt] = useState<string | null>(null);
  const [maxDurationSec, setMaxDurationSec] = useState(600);
  const [bannedKeywordsText, setBannedKeywordsText] = useState("");
  const [bannedChannelsText, setBannedChannelsText] = useState("");
  const [search, setSearch] = useState("");
  const [lastCount, setLastCount] = useState(0);
  const [newRequestFlash, setNewRequestFlash] = useState(false);

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  const filteredSongs = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) return songs;

    return songs.filter((song) => {
      return (
        getTitle(song).toLowerCase().includes(keyword) ||
        song.requester.toLowerCase().includes(keyword)
      );
    });
  }, [songs, search]);

  async function login() {
    setLoginError("");

    const res = await fetch("/api/admin-login", {
      method: "POST",
      body: JSON.stringify({ password }),
    });

    const data = await res.json();

    if (!data.success) {
      setLoginError("비밀번호가 올바르지 않습니다.");
      return;
    }

    setIsLoggedIn(true);
  }

  async function loadSongs() {
    const res = await fetch("/api/songs");
    const data = await res.json();

    const nextSongs = data.songs ?? [];

    if (lastCount !== 0 && nextSongs.length > lastCount) {
      setNewRequestFlash(true);
      setTimeout(() => setNewRequestFlash(false), 900);
    }

    setLastCount(nextSongs.length);
    setSongs(nextSongs);
    setHistory(data.history ?? []);
    setCurrentSong(data.currentSong ?? null);
    setIsRequestOpen(data.isRequestOpen ?? true);
    setRequestCloseAt(data.requestCloseAt ?? null);
    setMaxDurationSec(data.maxDurationSec ?? 600);
    setBannedKeywordsText((data.bannedKeywords ?? []).join(", "));
    setBannedChannelsText((data.bannedChannels ?? []).join(", "));
  }

  async function action(body: object) {
    await fetch("/api/songs", {
      method: "POST",
      body: JSON.stringify(body),
    });

    loadSongs();
  }

  function saveSettings() {
    const bannedKeywords = bannedKeywordsText
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    const bannedChannels = bannedChannelsText
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    action({
      action: "settings",
      maxDurationSec,
      bannedKeywords,
      bannedChannels,
    });
  }

  useEffect(() => {
    if (!isLoggedIn) return;

    loadSongs();

    const timer = setInterval(loadSongs, 3000);

    return () => clearInterval(timer);
  }, [isLoggedIn]);

  if (!isLoggedIn) {
    return (
      <main
        style={{
          minHeight: "100vh",
          background:
            "radial-gradient(circle at 8% 8%, rgba(139,92,246,0.18), transparent 34%), linear-gradient(180deg, #0f172a 0%, #020617 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "420px",
            background: "rgba(15,23,42,0.85)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "28px",
            padding: "40px",
            color: "white",
            boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
          }}
        >
          <p style={{ color: "#a5b4fc", marginBottom: "10px" }}>
            CHZZK ADMIN
          </p>

          <h1 style={{ marginTop: 0, marginBottom: "28px", fontSize: "38px" }}>
            🔐 관리자 로그인
          </h1>

          <input
            type="password"
            placeholder="관리자 비밀번호 입력"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") login();
            }}
            style={{
              width: "100%",
              padding: "18px",
              borderRadius: "18px",
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.06)",
              color: "white",
              outline: "none",
              fontSize: "16px",
              marginBottom: "18px",
              boxSizing: "border-box",
            }}
          />

          {loginError && (
            <div
              style={{
                background: "rgba(239,68,68,0.14)",
                color: "#fca5a5",
                padding: "14px",
                borderRadius: "16px",
                marginBottom: "18px",
              }}
            >
              {loginError}
            </div>
          )}

          <button
            onClick={login}
            style={{
              width: "100%",
              padding: "18px",
              borderRadius: "18px",
              border: "none",
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              color: "white",
              fontWeight: 800,
              fontSize: "18px",
              cursor: "pointer",
            }}
          >
            로그인
          </button>
        </div>
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at 8% 8%, rgba(139,92,246,0.18), transparent 34%), linear-gradient(180deg, #0f172a 0%, #020617 100%)",
        color: "white",
        padding: "36px",
      }}
    >
      <div style={{ maxWidth: "1500px", margin: "0 auto" }}>
        <section
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "24px",
            flexWrap: "wrap",
            gap: "20px",
          }}
        >
          <div>
            <p style={{ color: "#a5b4fc", marginBottom: "8px" }}>
              CHZZK MUSIC CONTROL
            </p>

            <h1 style={{ fontSize: "44px", margin: 0, fontWeight: 900 }}>
              🎛️ 관리자 대시보드
            </h1>
          </div>

          <div style={{ display: "flex", gap: "14px", flexWrap: "wrap" }}>
            <StatBox label="대기열" value={`${songs.length}곡`} />
            <StatBox label="재생 상태" value={currentSong ? "재생 중" : "대기 중"} />
            <StatBox label="총 이력" value={`${history.length}개`} />
          </div>
        </section>

        <section
          style={{
            marginBottom: "24px",
            display: "flex",
            gap: "12px",
            flexWrap: "wrap",
          }}
        >
          <button
            onClick={() => action({ action: "toggleRequest" })}
            style={buttonStyle(
              isRequestOpen
                ? "linear-gradient(135deg, #22c55e, #16a34a)"
                : "linear-gradient(135deg, #ef4444, #dc2626)"
            )}
          >
            {isRequestOpen ? "🟢 신청곡 받는 중" : "🔴 신청곡 닫힘"}
          </button>

          <button
            onClick={() => action({ action: "closeTimer", minutes: 10 })}
            style={buttonStyle("rgba(255,255,255,0.08)")}
          >
            ⏱ 10분 뒤 마감
          </button>

          <button
            onClick={() => action({ action: "closeTimer", minutes: null })}
            style={buttonStyle("rgba(255,255,255,0.08)")}
          >
            예약 취소
          </button>

          <button
            onClick={() => {
              if (confirm("현재곡과 대기열을 전부 초기화할까요?")) {
                action({ action: "reset" });
              }
            }}
            style={buttonStyle("rgba(239,68,68,0.18)", "#fca5a5")}
          >
            🧹 전체 초기화
          </button>

          {requestCloseAt && (
            <div
              style={{
                padding: "16px 20px",
                borderRadius: "18px",
                background: "rgba(99,102,241,0.16)",
                color: "#c4b5fd",
                fontWeight: 800,
              }}
            >
              마감 예약: {new Date(requestCloseAt).toLocaleTimeString()}
            </div>
          )}
        </section>

        {newRequestFlash && (
          <div
            style={{
              marginBottom: "20px",
              padding: "16px 20px",
              borderRadius: "18px",
              background: "rgba(34,197,94,0.16)",
              color: "#86efac",
              fontWeight: 900,
              boxShadow: "0 0 32px rgba(34,197,94,0.18)",
            }}
          >
            ✨ 새 신청곡이 들어왔습니다!
          </div>
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "430px 1fr 340px",
            gap: "22px",
            alignItems: "start",
          }}
        >
          <section
            style={{
              background: currentSong
                ? "linear-gradient(135deg, rgba(99,102,241,0.28), rgba(236,72,153,0.12))"
                : "rgba(15,23,42,0.75)",
              border: currentSong
                ? "1px solid rgba(167,139,250,0.45)"
                : "1px solid rgba(255,255,255,0.08)",
              borderRadius: "28px",
              padding: "26px",
              boxShadow: currentSong
                ? "0 0 44px rgba(139,92,246,0.22)"
                : "0 20px 60px rgba(0,0,0,0.22)",
            }}
          >
            <p style={{ color: "#c4b5fd", marginBottom: "10px" }}>
              NOW PLAYING
            </p>

            <h2 style={{ marginTop: 0, fontSize: "28px" }}>현재 재생 중</h2>

            {currentSong ? (
              <>
                {getThumbnail(currentSong) && (
                  <img
                    src={getThumbnail(currentSong)!}
                    alt={getTitle(currentSong)}
                    style={{
                      width: "100%",
                      height: "230px",
                      objectFit: "cover",
                      borderRadius: "22px",
                      marginBottom: "18px",
                    }}
                  />
                )}

                <h3 style={{ fontSize: "24px", lineHeight: 1.45 }}>
                  {getTitle(currentSong)}
                </h3>

                <p style={{ color: "#cbd5e1" }}>
                  신청자: {currentSong.requester}
                </p>

                <p style={{ color: "#94a3b8" }}>
                  길이: {formatDuration(currentSong.duration_sec)}
                </p>

                <button
                  onClick={() => action({ action: "skip" })}
                  style={{
                    ...buttonStyle("linear-gradient(135deg, #ef4444, #dc2626)"),
                    width: "100%",
                    marginTop: "16px",
                  }}
                >
                  ⏭️ 현재 곡 스킵
                </button>
              </>
            ) : (
              <>
                <div
                  style={{
                    height: "340px",
                    borderRadius: "24px",
                    background: "rgba(255,255,255,0.04)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: "24px",
                    color: "#94a3b8",
                  }}
                >
                  현재 재생 중인 곡 없음
                </div>

                <button
                  onClick={() => action({ action: "next" })}
                  style={{
                    ...buttonStyle("linear-gradient(135deg, #6366f1, #8b5cf6)"),
                    width: "100%",
                  }}
                >
                  ▶️ 다음 곡 재생
                </button>
              </>
            )}
          </section>

          <section
            style={{
              background: "rgba(15,23,42,0.75)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "28px",
              padding: "26px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: "16px",
                alignItems: "center",
                marginBottom: "20px",
              }}
            >
              <h2 style={{ margin: 0, fontSize: "30px" }}>신청곡 대기열</h2>

              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="신청자 / 제목 검색"
                style={{
                  width: "240px",
                  padding: "13px",
                  borderRadius: "14px",
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: "rgba(255,255,255,0.06)",
                  color: "white",
                  outline: "none",
                }}
              />
            </div>

            {filteredSongs.length === 0 ? (
              <div
                style={{
                  height: "520px",
                  borderRadius: "24px",
                  background: "rgba(255,255,255,0.04)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#94a3b8",
                }}
              >
                대기 중인 신청곡이 없습니다.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                {filteredSongs.map((song, index) => {
                  const thumbnail = getThumbnail(song);

                  return (
                    <div
                      key={song.id}
                      style={{
                        background: "rgba(30,41,59,0.8)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        borderRadius: "22px",
                        padding: "16px",
                        display: "grid",
                        gridTemplateColumns: "110px 1fr auto",
                        alignItems: "center",
                        gap: "16px",
                        transition: "0.18s",
                      }}
                    >
                      {thumbnail ? (
                        <img
                          src={thumbnail}
                          alt={getTitle(song)}
                          style={{
                            width: "110px",
                            height: "68px",
                            objectFit: "cover",
                            borderRadius: "16px",
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: "110px",
                            height: "68px",
                            borderRadius: "16px",
                            background: "rgba(255,255,255,0.06)",
                          }}
                        />
                      )}

                      <div>
                        <p
                          style={{
                            color: "#818cf8",
                            marginTop: 0,
                            marginBottom: "6px",
                            fontWeight: 900,
                          }}
                        >
                          #{songs.findIndex((item) => item.id === song.id) + 1}
                        </p>

                        <h3 style={{ margin: 0, fontSize: "18px", lineHeight: 1.4 }}>
                          {getTitle(song)}
                        </h3>

                        <p style={{ color: "#cbd5e1", marginBottom: 0 }}>
                          신청자: {song.requester} · {formatDuration(song.duration_sec)}
                        </p>
                      </div>

                      <div style={{ display: "grid", gap: "7px", minWidth: "112px" }}>
                        <button
                          onClick={() => action({ action: "playNow", id: song.id })}
                          style={smallButtonStyle("linear-gradient(135deg, #6366f1, #8b5cf6)")}
                        >
                          재생
                        </button>

                        <button
                          onClick={() =>
                            action({ action: "move", id: song.id, direction: "up" })
                          }
                          disabled={index === 0}
                          style={smallButtonStyle("rgba(255,255,255,0.08)")}
                        >
                          ↑ 위로
                        </button>

                        <button
                          onClick={() =>
                            action({ action: "move", id: song.id, direction: "down" })
                          }
                          disabled={index === filteredSongs.length - 1}
                          style={smallButtonStyle("rgba(255,255,255,0.08)")}
                        >
                          ↓ 아래
                        </button>

                        <button
                          onClick={() => action({ action: "delete", id: song.id })}
                          style={smallButtonStyle("rgba(239,68,68,0.15)", "#fca5a5")}
                        >
                          삭제
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <aside style={{ display: "grid", gap: "18px" }}>
            <Panel title="설정">
              <label style={labelStyle}>최대 영상 길이(초)</label>
              <input
                type="number"
                value={maxDurationSec}
                onChange={(e) => setMaxDurationSec(Number(e.target.value))}
                style={inputStyle}
              />

              <label style={labelStyle}>금지어 목록 (,로 구분)</label>
              <textarea
                value={bannedKeywordsText}
                onChange={(e) => setBannedKeywordsText(e.target.value)}
                style={{ ...inputStyle, height: "80px" }}
              />

              <label style={labelStyle}>금지 채널 목록 (,로 구분)</label>
              <textarea
                value={bannedChannelsText}
                onChange={(e) => setBannedChannelsText(e.target.value)}
                style={{ ...inputStyle, height: "80px" }}
              />

              <button
                onClick={saveSettings}
                style={{
                  ...buttonStyle("linear-gradient(135deg, #6366f1, #8b5cf6)"),
                  width: "100%",
                  marginTop: "12px",
                }}
              >
                설정 저장
              </button>
            </Panel>

            <Panel title="재생 이력">
              {history.length === 0 ? (
                <p style={{ color: "#94a3b8" }}>아직 이력이 없습니다.</p>
              ) : (
                <div style={{ display: "grid", gap: "10px" }}>
                  {history.slice(0, 8).map((item) => (
                    <div
                      key={item.id}
                      style={{
                        padding: "12px",
                        borderRadius: "14px",
                        background: "rgba(255,255,255,0.05)",
                      }}
                    >
                      <strong style={{ fontSize: "14px" }}>{getTitle(item)}</strong>
                      <p style={{ margin: "6px 0 0", color: "#94a3b8", fontSize: "13px" }}>
                        {item.requester}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          </aside>
        </div>
      </div>
    </main>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.06)",
        padding: "18px 24px",
        borderRadius: "20px",
        minWidth: "130px",
      }}
    >
      <p style={{ margin: 0, color: "#94a3b8" }}>{label}</p>
      <h2 style={{ margin: "8px 0 0", fontSize: "24px" }}>{value}</h2>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section
      style={{
        background: "rgba(15,23,42,0.75)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "24px",
        padding: "22px",
      }}
    >
      <h2 style={{ marginTop: 0, fontSize: "22px" }}>{title}</h2>
      {children}
    </section>
  );
}

function buttonStyle(background: string, color = "white") {
  return {
    padding: "15px 20px",
    borderRadius: "18px",
    border: "none",
    background,
    color,
    fontWeight: 800,
    fontSize: "15px",
    cursor: "pointer",
  };
}

function smallButtonStyle(background: string, color = "white") {
  return {
    padding: "9px 12px",
    borderRadius: "13px",
    border: "none",
    background,
    color,
    fontWeight: 800,
    cursor: "pointer",
  };
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "12px",
  borderRadius: "14px",
  border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(255,255,255,0.06)",
  color: "white",
  outline: "none",
  marginBottom: "12px",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  color: "#cbd5e1",
  fontSize: "14px",
  marginBottom: "8px",
};