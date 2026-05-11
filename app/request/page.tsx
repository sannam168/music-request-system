"use client";

import { useEffect, useState } from "react";

type YoutubeResult = {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnail: string;
  url: string;
};

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

function getThumbnail(song: SongRequest) {
  if (song.thumbnail) return song.thumbnail;

  const videoId = getYoutubeId(song.song);
  if (!videoId) return null;

  return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
}

function getTitle(song: SongRequest) {
  return song.title || song.song;
}

export default function RequestPage() {
  const [requester, setRequester] = useState("");
  const [song, setSong] = useState("");
  const [message, setMessage] = useState("");
  const [results, setResults] = useState<YoutubeResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isRequestOpen, setIsRequestOpen] = useState(true);
  const [queue, setQueue] = useState<SongRequest[]>([]);
  const [currentSong, setCurrentSong] = useState<SongRequest | null>(null);

  async function loadState() {
    const res = await fetch("/api/songs");
    const data = await res.json();

    setQueue(data.songs ?? []);
    setCurrentSong(data.currentSong ?? null);
    setIsRequestOpen(data.isRequestOpen ?? true);
  }

  async function searchYoutube() {
    if (!song.trim() || !isRequestOpen) return;

    setIsSearching(true);
    setMessage("");

    const res = await fetch(`/api/youtube/search?q=${encodeURIComponent(song)}`);
    const data = await res.json();

    setResults(data ?? []);
    setIsSearching(false);
  }

  async function submitSong(item: YoutubeResult) {
    if (!requester.trim()) {
      setMessage("❌ 닉네임을 입력해주세요.");
      return;
    }

    const res = await fetch("/api/songs", {
      method: "POST",
      body: JSON.stringify({
        action: "add",
        requester,
        song: item.url,
        title: item.title,
        thumbnail: item.thumbnail,
        channelTitle: item.channelTitle,
        videoId: item.videoId,
      }),
    });

    const data = await res.json();

    setSong("");
    setResults([]);

    if (data.error) {
      setMessage(`❌ ${data.error}`);
    } else {
      setMessage("🎉 신청 완료! 대기열에 추가되었습니다.");
    }

    loadState();
  }

  useEffect(() => {
    const savedRequester = localStorage.getItem("requesterName");

    if (savedRequester) {
      setRequester(savedRequester);
    }

    loadState();

    const timer = setInterval(loadState, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at 8% 8%, rgba(139,92,246,0.22), transparent 34%), radial-gradient(circle at 92% 12%, rgba(236,72,153,0.12), transparent 28%), linear-gradient(180deg, #0f172a 0%, #020617 100%)",
        color: "white",
        padding: "42px 28px",
      }}
    >
      <div style={{ maxWidth: "1450px", margin: "0 auto" }}>
        <section
          style={{
            background: "rgba(15,23,42,0.72)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "30px",
            padding: "34px",
            marginBottom: "24px",
            boxShadow: "0 24px 80px rgba(0,0,0,0.35)",
            backdropFilter: "blur(16px)",
          }}
        >
          <p style={{ color: "#a5b4fc", margin: "0 0 8px", fontSize: 13 }}>
            CHZZK MUSIC REQUEST
          </p>

          <h1 style={{ fontSize: "46px", margin: 0, letterSpacing: "-1px" }}>
            🎵 신청곡 접수
          </h1>

          <p style={{ color: "#cbd5e1", fontSize: "16px", marginTop: "12px" }}>
            원하는 노래를 검색하고 방송에 신청하세요.
          </p>

          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              marginTop: "18px",
              padding: "9px 14px",
              borderRadius: "999px",
              background: isRequestOpen
                ? "rgba(34,197,94,0.14)"
                : "rgba(239,68,68,0.14)",
              color: isRequestOpen ? "#86efac" : "#fca5a5",
              fontWeight: 800,
            }}
          >
            ● {isRequestOpen ? "신청 가능" : "신청 마감"}
          </div>
        </section>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 440px",
            gap: "24px",
            alignItems: "start",
          }}
        >
          <section
            style={{
              background: "rgba(15,23,42,0.66)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "30px",
              padding: "28px",
              boxShadow: "0 20px 60px rgba(0,0,0,0.28)",
              backdropFilter: "blur(14px)",
            }}
          >
            <h2 style={{ marginTop: 0, fontSize: "26px" }}>노래 검색</h2>

            <input
              value={requester}
              onChange={(e) => {
                setRequester(e.target.value);
                localStorage.setItem("requesterName", e.target.value);
              }}
              placeholder="닉네임"
              style={{
                width: "100%",
                padding: "16px",
                borderRadius: "16px",
                marginBottom: "12px",
                border: "1px solid rgba(255,255,255,0.08)",
                background: "rgba(255,255,255,0.045)",
                color: "white",
                fontSize: "15px",
                outline: "none",
              }}
            />

            <div style={{ display: "flex", gap: "12px" }}>
              <input
                value={song}
                onChange={(e) => setSong(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") searchYoutube();
                }}
                placeholder="노래 제목 또는 유튜브 링크 입력"
                style={{
                  flex: 1,
                  padding: "16px",
                  borderRadius: "16px",
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: "rgba(255,255,255,0.045)",
                  color: "white",
                  fontSize: "15px",
                  outline: "none",
                }}
              />

              <button
                disabled={!isRequestOpen}
                onClick={searchYoutube}
                style={{
                  padding: "16px 30px",
                  borderRadius: "16px",
                  border: "none",
                  background: isRequestOpen
                    ? "linear-gradient(135deg, #6366f1, #8b5cf6)"
                    : "rgba(148,163,184,0.25)",
                  color: "white",
                  fontWeight: 900,
                  cursor: isRequestOpen ? "pointer" : "not-allowed",
                }}
              >
                {!isRequestOpen ? "마감" : isSearching ? "검색 중..." : "검색"}
              </button>
            </div>

            {message && (
              <div
                style={{
                  marginTop: "18px",
                  padding: "14px 16px",
                  borderRadius: "16px",
                  background: message.startsWith("❌")
                    ? "rgba(239,68,68,0.14)"
                    : "rgba(34,197,94,0.14)",
                  color: message.startsWith("❌") ? "#fca5a5" : "#86efac",
                  fontWeight: 800,
                }}
              >
                {message}
              </div>
            )}

            <section style={{ marginTop: "26px" }}>
              {results.length === 0 ? (
                <div
                  style={{
                    height: "320px",
                    borderRadius: "24px",
                    background: "rgba(255,255,255,0.035)",
                    border: "1px solid rgba(255,255,255,0.04)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#64748b",
                  }}
                >
                  검색 결과가 여기에 표시됩니다.
                </div>
              ) : (
                <div style={{ display: "grid", gap: "16px" }}>
                  {results.map((item) => (
                    <div
                      key={item.videoId}
                      style={{
                        display: "flex",
                        gap: "18px",
                        background: "rgba(30,41,59,0.76)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        borderRadius: "22px",
                        padding: "16px",
                      }}
                    >
                      <img
                        src={item.thumbnail}
                        alt={item.title}
                        style={{
                          width: "180px",
                          height: "105px",
                          borderRadius: "16px",
                          objectFit: "cover",
                        }}
                      />

                      <div style={{ flex: 1 }}>
                        <h3
                          style={{
                            margin: "0 0 8px",
                            fontSize: "18px",
                            lineHeight: 1.4,
                          }}
                        >
                          {item.title}
                        </h3>

                        <p style={{ color: "#94a3b8", margin: "0 0 14px" }}>
                          {item.channelTitle}
                        </p>

                        <button
                          onClick={() => submitSong(item)}
                          style={{
                            padding: "12px 16px",
                            borderRadius: "14px",
                            border: "none",
                            background:
                              "linear-gradient(135deg, #ec4899, #8b5cf6)",
                            color: "white",
                            fontWeight: 900,
                            cursor: "pointer",
                          }}
                        >
                          🎵 이 곡 신청
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </section>

          <aside style={{ display: "grid", gap: "18px" }}>
            <section
              style={{
                background: currentSong
                  ? "linear-gradient(135deg, rgba(99,102,241,0.28), rgba(236,72,153,0.14))"
                  : "rgba(15,23,42,0.72)",
                border: currentSong
                  ? "1px solid rgba(167,139,250,0.5)"
                  : "1px solid rgba(255,255,255,0.08)",
                borderRadius: "30px",
                padding: "24px",
              }}
            >
              <p style={{ color: "#c4b5fd", margin: "0 0 12px", fontWeight: 800 }}>
                NOW PLAYING
              </p>

              <h2 style={{ margin: "0 0 16px", fontSize: "22px" }}>
                현재 재생중인 노래
              </h2>

              {currentSong ? (
                <div>
                  {getThumbnail(currentSong) && (
                    <img
                      src={getThumbnail(currentSong)!}
                      alt={getTitle(currentSong)}
                      style={{
                        width: "100%",
                        height: "190px",
                        objectFit: "cover",
                        borderRadius: "22px",
                        marginBottom: "16px",
                      }}
                    />
                  )}

                  <h3 style={{ margin: "0 0 10px", lineHeight: 1.45 }}>
                    {getTitle(currentSong)}
                  </h3>

                  <p style={{ color: "#cbd5e1", margin: 0 }}>
                    신청자: {currentSong.requester}
                  </p>
                </div>
              ) : (
                <div
                  style={{
                    height: "140px",
                    borderRadius: "22px",
                    background: "rgba(255,255,255,0.04)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#64748b",
                  }}
                >
                  현재 재생 중인 곡이 없습니다.
                </div>
              )}
            </section>

            <section
              style={{
                background: "rgba(15,23,42,0.72)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "30px",
                padding: "24px",
                minHeight: "560px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "16px",
                }}
              >
                <div>
                  <p style={{ color: "#a5b4fc", margin: "0 0 8px", fontWeight: 800 }}>
                    QUEUE
                  </p>

                  <h2 style={{ margin: 0, fontSize: "22px" }}>
                    신청곡 대기열
                  </h2>
                </div>

                <strong
                  style={{
                    background: "rgba(99,102,241,0.18)",
                    color: "#c4b5fd",
                    padding: "8px 12px",
                    borderRadius: "999px",
                  }}
                >
                  {queue.length}곡
                </strong>
              </div>

              {queue.length === 0 ? (
                <div
                  style={{
                    height: "430px",
                    borderRadius: "22px",
                    background: "rgba(255,255,255,0.04)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#64748b",
                    textAlign: "center",
                    padding: "20px",
                  }}
                >
                  아직 대기 중인 신청곡이 없습니다.
                </div>
              ) : (
                <div
                  style={{
                    display: "grid",
                    gap: "12px",
                    maxHeight: "720px",
                    overflowY: "auto",
                    paddingRight: "4px",
                  }}
                >
                  {queue.map((item, index) => {
                    const thumbnail = getThumbnail(item);

                    return (
                      <div
                        key={item.id}
                        style={{
                          display: "flex",
                          gap: "12px",
                          background: "rgba(30,41,59,0.76)",
                          border: "1px solid rgba(255,255,255,0.08)",
                          borderRadius: "18px",
                          padding: "12px",
                        }}
                      >
                        {thumbnail ? (
                          <img
                            src={thumbnail}
                            alt={getTitle(item)}
                            style={{
                              width: "86px",
                              height: "58px",
                              objectFit: "cover",
                              borderRadius: "12px",
                              flexShrink: 0,
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              width: "86px",
                              height: "58px",
                              borderRadius: "12px",
                              background: "rgba(255,255,255,0.06)",
                              flexShrink: 0,
                            }}
                          />
                        )}

                        <div style={{ minWidth: 0 }}>
                          <p
                            style={{
                              color: "#818cf8",
                              margin: "0 0 4px",
                              fontWeight: 900,
                              fontSize: "13px",
                            }}
                          >
                            #{index + 1}
                          </p>

                          <h3
                            style={{
                              margin: "0 0 5px",
                              fontSize: "14px",
                              lineHeight: 1.35,
                              wordBreak: "break-word",
                            }}
                          >
                            {getTitle(item)}
                          </h3>

                          <p
                            style={{
                              margin: 0,
                              color: "#94a3b8",
                              fontSize: "13px",
                            }}
                          >
                            신청자: {item.requester}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}