"use client";

import { useEffect, useState } from "react";

type SongRequest = {
  id: number;
  requester: string;
  song: string;
  title?: string;
  thumbnail?: string;
  channel_title?: string;
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

export default function AdminPage() {
  const [songs, setSongs] = useState<SongRequest[]>([]);
  const [currentSong, setCurrentSong] = useState<SongRequest | null>(null);
  const [isRequestOpen, setIsRequestOpen] = useState(true);

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");

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

    setSongs(data.songs ?? []);
    setCurrentSong(data.currentSong ?? null);
    setIsRequestOpen(data.isRequestOpen ?? true);
  }

  async function action(body: object) {
    await fetch("/api/songs", {
      method: "POST",
      body: JSON.stringify(body),
    });

    loadSongs();
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
                border: "1px solid rgba(239,68,68,0.22)",
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
              background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
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
        padding: "40px",
      }}
    >
      <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
        <section
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "28px",
            flexWrap: "wrap",
            gap: "20px",
          }}
        >
          <div>
            <p style={{ color: "#a5b4fc", marginBottom: "8px" }}>
              CHZZK MUSIC CONTROL
            </p>

            <h1 style={{ fontSize: "46px", margin: 0, fontWeight: 900 }}>
              🎛️ 관리자 대시보드
            </h1>
          </div>

          <div style={{ display: "flex", gap: "16px" }}>
            <div
              style={{
                background: "rgba(255,255,255,0.06)",
                padding: "20px 26px",
                borderRadius: "20px",
                minWidth: "150px",
              }}
            >
              <p style={{ margin: 0, color: "#94a3b8" }}>대기열</p>
              <h2 style={{ margin: "10px 0 0", fontSize: "32px" }}>
                {songs.length}
              </h2>
            </div>

            <div
              style={{
                background: "rgba(255,255,255,0.06)",
                padding: "20px 26px",
                borderRadius: "20px",
                minWidth: "150px",
              }}
            >
              <p style={{ margin: 0, color: "#94a3b8" }}>재생 상태</p>
              <h2 style={{ margin: "10px 0 0", fontSize: "24px" }}>
                {currentSong ? "재생 중" : "대기 중"}
              </h2>
            </div>
          </div>
        </section>

        <section style={{ marginBottom: "24px" }}>
          <button
            onClick={() => action({ action: "toggleRequest" })}
            style={{
              padding: "16px 24px",
              borderRadius: "18px",
              border: "none",
              background: isRequestOpen
                ? "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)"
                : "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
              color: "white",
              fontWeight: 800,
              fontSize: "16px",
              cursor: "pointer",
            }}
          >
            {isRequestOpen ? "🟢 신청곡 받는 중" : "🔴 신청곡 닫힘"}
          </button>
        </section>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "420px 1fr",
            gap: "24px",
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
              padding: "28px",
              minHeight: "560px",
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

                <p style={{ color: "#cbd5e1", fontSize: "16px" }}>
                  신청자: {currentSong.requester}
                </p>

                <button
                  onClick={() => action({ action: "skip" })}
                  style={{
                    width: "100%",
                    padding: "18px",
                    borderRadius: "18px",
                    border: "none",
                    background:
                      "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
                    color: "white",
                    fontWeight: 800,
                    fontSize: "18px",
                    cursor: "pointer",
                    marginTop: "24px",
                  }}
                >
                  ⏭️ 현재 곡 스킵
                </button>
              </>
            ) : (
              <>
                <div
                  style={{
                    height: "360px",
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
                    width: "100%",
                    padding: "18px",
                    borderRadius: "18px",
                    border: "none",
                    background:
                      "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
                    color: "white",
                    fontWeight: 800,
                    fontSize: "18px",
                    cursor: "pointer",
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
              padding: "28px",
              boxShadow: "0 20px 60px rgba(0,0,0,0.22)",
            }}
          >
            <h2 style={{ marginTop: 0, marginBottom: "24px", fontSize: "30px" }}>
              신청곡 대기열
            </h2>

            {songs.length === 0 ? (
              <div
                style={{
                  height: "520px",
                  borderRadius: "24px",
                  background: "rgba(255,255,255,0.04)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#94a3b8",
                  fontSize: "18px",
                }}
              >
                현재 대기 중인 신청곡이 없습니다.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {songs.map((song, index) => {
                  const thumbnail = getThumbnail(song);

                  return (
                    <div
                      key={song.id}
                      style={{
                        background: "rgba(30,41,59,0.8)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        borderRadius: "22px",
                        padding: "18px",
                        display: "grid",
                        gridTemplateColumns: "120px 1fr auto",
                        alignItems: "center",
                        gap: "18px",
                      }}
                    >
                      {thumbnail ? (
                        <img
                          src={thumbnail}
                          alt={getTitle(song)}
                          style={{
                            width: "120px",
                            height: "72px",
                            objectFit: "cover",
                            borderRadius: "16px",
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: "120px",
                            height: "72px",
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
                            marginBottom: "8px",
                            fontWeight: 900,
                          }}
                        >
                          #{index + 1}
                        </p>

                        <h3
                          style={{
                            margin: 0,
                            fontSize: "20px",
                            lineHeight: 1.45,
                          }}
                        >
                          {getTitle(song)}
                        </h3>

                        <p style={{ color: "#cbd5e1", marginBottom: 0 }}>
                          신청자: {song.requester}
                        </p>
                      </div>

                      <div style={{ display: "grid", gap: "8px", minWidth: "120px" }}>
                        <button
                          onClick={() => action({ action: "playNow", id: song.id })}
                          style={{
                            padding: "10px 14px",
                            borderRadius: "14px",
                            border: "none",
                            background:
                              "linear-gradient(135deg, #6366f1, #8b5cf6)",
                            color: "white",
                            fontWeight: 800,
                            cursor: "pointer",
                          }}
                        >
                          재생
                        </button>

                        <button
                          onClick={() =>
                            action({
                              action: "move",
                              id: song.id,
                              direction: "up",
                            })
                          }
                          disabled={index === 0}
                          style={{
                            padding: "9px 14px",
                            borderRadius: "14px",
                            border: "none",
                            background:
                              index === 0
                                ? "rgba(148,163,184,0.15)"
                                : "rgba(255,255,255,0.08)",
                            color: "white",
                            cursor: index === 0 ? "not-allowed" : "pointer",
                          }}
                        >
                          ↑ 위로
                        </button>

                        <button
                          onClick={() =>
                            action({
                              action: "move",
                              id: song.id,
                              direction: "down",
                            })
                          }
                          disabled={index === songs.length - 1}
                          style={{
                            padding: "9px 14px",
                            borderRadius: "14px",
                            border: "none",
                            background:
                              index === songs.length - 1
                                ? "rgba(148,163,184,0.15)"
                                : "rgba(255,255,255,0.08)",
                            color: "white",
                            cursor:
                              index === songs.length - 1
                                ? "not-allowed"
                                : "pointer",
                          }}
                        >
                          ↓ 아래
                        </button>

                        <button
                          onClick={() => action({ action: "delete", id: song.id })}
                          style={{
                            padding: "10px 14px",
                            borderRadius: "14px",
                            border: "none",
                            background: "rgba(239,68,68,0.15)",
                            color: "#fca5a5",
                            fontWeight: 800,
                            cursor: "pointer",
                          }}
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
        </div>
      </div>
    </main>
  );
}