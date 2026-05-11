"use client";

import { useEffect, useMemo, useState } from "react";

type YoutubeResult = {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnail: string;
  url: string;
  durationSec?: number;
};

type SongRequest = {
  id: number;
  requester: string;
  song: string;
  title?: string;
  thumbnail?: string;
  channel_title?: string;
  duration_sec?: number;
  status?: string;
};

type Tab = "request" | "community";

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

function formatDuration(sec?: number) {
  if (!sec) return "-";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function getUserColor(name: string) {
  const colors = [
    "#818cf8",
    "#f472b6",
    "#34d399",
    "#fbbf24",
    "#60a5fa",
    "#c084fc",
    "#fb7185",
  ];

  let total = 0;

  for (let i = 0; i < name.length; i++) {
    total += name.charCodeAt(i);
  }

  return colors[total % colors.length];
}

export default function RequestPage() {
  const [activeTab, setActiveTab] = useState<Tab>("request");

  const [requester, setRequester] = useState("");
  const [song, setSong] = useState("");
  const [message, setMessage] = useState("");

  const [results, setResults] = useState<YoutubeResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const [isRequestOpen, setIsRequestOpen] = useState(true);
  const [requestCloseAt, setRequestCloseAt] = useState<string | null>(null);
  const [maxDurationSec, setMaxDurationSec] = useState(600);

  const [queue, setQueue] = useState<SongRequest[]>([]);
  const [history, setHistory] = useState<SongRequest[]>([]);
  const [currentSong, setCurrentSong] = useState<SongRequest | null>(null);

  const [likes, setLikes] = useState<Record<number, number>>({});
  const [likedSongIds, setLikedSongIds] = useState<number[]>([]);
  const [newQueueFlash, setNewQueueFlash] = useState(false);
  const [lastQueueCount, setLastQueueCount] = useState(0);

  async function loadState() {
    const res = await fetch("/api/songs");
    const data = await res.json();

    const nextQueue = data.songs ?? [];

    if (lastQueueCount !== 0 && nextQueue.length > lastQueueCount) {
      setNewQueueFlash(true);
      setTimeout(() => setNewQueueFlash(false), 900);
    }

    setLastQueueCount(nextQueue.length);
    setQueue(nextQueue);
    setHistory(data.history ?? []);
    setCurrentSong(data.currentSong ?? null);
    setIsRequestOpen(data.isRequestOpen ?? true);
    setRequestCloseAt(data.requestCloseAt ?? null);
    setMaxDurationSec(data.maxDurationSec ?? 600);
  }

  async function searchYoutube() {
    if (!song.trim()) {
      setMessage("❌ 검색어를 입력해주세요.");
      return;
    }

    if (!isRequestOpen) {
      setMessage("❌ 현재 신청곡 접수가 마감되었습니다.");
      return;
    }

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
        durationSec: item.durationSec,
      }),
    });

    const data = await res.json();

    setSong("");
    setResults([]);

    if (data.error) {
      setMessage(`❌ ${data.error}`);
    } else {
      const position = queue.length + 1;
      setMessage(`🎉 신청 완료! 현재 예상 대기 순번은 ${position}번째입니다.`);
    }

    loadState();
  }

  function toggleLike(songId: number) {
    const hasLiked = likedSongIds.includes(songId);

    const nextLikedSongIds = hasLiked
      ? likedSongIds.filter((id) => id !== songId)
      : [...likedSongIds, songId];

    const nextLikes = {
      ...likes,
      [songId]: Math.max((likes[songId] ?? 0) + (hasLiked ? -1 : 1), 0),
    };

    setLikedSongIds(nextLikedSongIds);
    setLikes(nextLikes);

    localStorage.setItem("likedSongIds", JSON.stringify(nextLikedSongIds));
    localStorage.setItem("songLikes", JSON.stringify(nextLikes));
  }

  const closeCountdown = useMemo(() => {
    if (!requestCloseAt) return null;

    const diff = new Date(requestCloseAt).getTime() - Date.now();

    if (diff <= 0) return "곧 마감";

    const minutes = Math.floor(diff / 1000 / 60);
    const seconds = Math.floor((diff / 1000) % 60);

    return `${minutes}:${String(seconds).padStart(2, "0")}`;
  }, [requestCloseAt, queue.length, currentSong]);

  const requesterRanking = useMemo(() => {
    const map = new Map<string, number>();

    [...queue, ...history].forEach((item) => {
      map.set(item.requester, (map.get(item.requester) ?? 0) + 1);
    });

    return [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [queue, history]);

  const popularSongs = useMemo(() => {
    return [...queue]
      .sort((a, b) => (likes[b.id] ?? 0) - (likes[a.id] ?? 0))
      .slice(0, 5);
  }, [queue, likes]);

  useEffect(() => {
    const savedRequester = localStorage.getItem("requesterName");
    const savedLikes = localStorage.getItem("songLikes");
    const savedLikedSongIds = localStorage.getItem("likedSongIds");

    if (savedRequester) {
      setRequester(savedRequester);
    }

    if (savedLikes) {
      setLikes(JSON.parse(savedLikes));
    }

    if (savedLikedSongIds) {
      setLikedSongIds(JSON.parse(savedLikedSongIds));
    }

    loadState();

    const timer = setInterval(loadState, 1000);
    const clock = setInterval(() => {
      setRequestCloseAt((prev) => prev);
    }, 1000);

    return () => {
      clearInterval(timer);
      clearInterval(clock);
    };
  }, []);

  return (
    <main className="page">
      <style jsx global>{`
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
        }

        .page {
          min-height: 100vh;
          background:
            radial-gradient(circle at 8% 8%, rgba(139, 92, 246, 0.22), transparent 34%),
            radial-gradient(circle at 92% 12%, rgba(236, 72, 153, 0.12), transparent 28%),
            linear-gradient(180deg, #0f172a 0%, #020617 100%);
          color: white;
          padding: 42px 28px;
          overflow-x: hidden;
        }

        .container {
          max-width: 1450px;
          margin: 0 auto;
        }

        .glass {
          background: rgba(15, 23, 42, 0.72);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 30px;
          box-shadow: 0 24px 80px rgba(0, 0, 0, 0.35);
          backdrop-filter: blur(16px);
        }

        .header {
          padding: 34px;
          margin-bottom: 24px;
          position: relative;
          overflow: hidden;
        }

        .header::after {
          content: "";
          position: absolute;
          width: 280px;
          height: 280px;
          right: -80px;
          top: -120px;
          border-radius: 999px;
          background: rgba(139, 92, 246, 0.18);
          filter: blur(20px);
        }

        .eyebrow {
          color: #a5b4fc;
          margin: 0 0 8px;
          font-size: 13px;
          font-weight: 800;
          letter-spacing: 0.06em;
        }

        .title {
          font-size: 46px;
          margin: 0;
          letter-spacing: -1px;
        }

        .subtitle {
          color: #cbd5e1;
          font-size: 16px;
          margin-top: 12px;
        }

        .statusRow {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          margin-top: 18px;
        }

        .pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 9px 14px;
          border-radius: 999px;
          font-weight: 800;
        }

        .pillOpen {
          background: rgba(34, 197, 94, 0.14);
          color: #86efac;
        }

        .pillClosed {
          background: rgba(239, 68, 68, 0.14);
          color: #fca5a5;
        }

        .pillInfo {
          background: rgba(99, 102, 241, 0.18);
          color: #c4b5fd;
        }

        .tabBar {
          display: inline-flex;
          padding: 6px;
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.06);
          margin-bottom: 24px;
        }

        .tabButton {
          padding: 13px 20px;
          border: none;
          border-radius: 14px;
          color: white;
          cursor: pointer;
          font-weight: 900;
          background: transparent;
        }

        .tabButtonActive {
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          box-shadow: 0 12px 30px rgba(99, 102, 241, 0.22);
        }

        .layout {
          display: grid;
          grid-template-columns: 1fr 440px;
          gap: 24px;
          align-items: start;
        }

        .mainPanel {
          padding: 28px;
        }

        .sidePanel {
          display: grid;
          gap: 18px;
        }

        .input {
          width: 100%;
          padding: 16px;
          border-radius: 16px;
          margin-bottom: 12px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(255, 255, 255, 0.045);
          color: white;
          font-size: 15px;
          outline: none;
        }

        .input::placeholder {
          color: #64748b;
        }

        .searchRow {
          display: flex;
          gap: 12px;
        }

        .button {
          padding: 16px 30px;
          border-radius: 16px;
          border: none;
          color: white;
          font-weight: 900;
          cursor: pointer;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
        }

        .button:disabled {
          background: rgba(148, 163, 184, 0.25);
          cursor: not-allowed;
        }

        .message {
          margin-top: 18px;
          padding: 14px 16px;
          border-radius: 16px;
          font-weight: 800;
        }

        .messageOk {
          background: rgba(34, 197, 94, 0.14);
          color: #86efac;
        }

        .messageError {
          background: rgba(239, 68, 68, 0.14);
          color: #fca5a5;
        }

        .emptyBox {
          height: 320px;
          border-radius: 24px;
          background: rgba(255, 255, 255, 0.035);
          border: 1px solid rgba(255, 255, 255, 0.04);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #64748b;
          text-align: center;
          padding: 20px;
        }

        .resultList {
          display: grid;
          gap: 16px;
          margin-top: 26px;
        }

        .resultCard {
          display: flex;
          gap: 18px;
          background: rgba(30, 41, 59, 0.76);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 22px;
          padding: 16px;
          transition: transform 0.18s, background 0.18s, box-shadow 0.18s;
        }

        .resultCard:hover {
          transform: translateY(-2px);
          background: rgba(51, 65, 85, 0.78);
          box-shadow: 0 18px 44px rgba(0, 0, 0, 0.22);
        }

        .resultThumb {
          width: 180px;
          height: 105px;
          border-radius: 16px;
          object-fit: cover;
          flex-shrink: 0;
        }

        .nowPlaying {
          padding: 24px;
          background: linear-gradient(135deg, rgba(99, 102, 241, 0.28), rgba(236, 72, 153, 0.14));
          border: 1px solid rgba(167, 139, 250, 0.5);
          box-shadow: 0 0 40px rgba(139, 92, 246, 0.22);
        }

        .nowIdle {
          padding: 24px;
        }

        .nowThumb {
          width: 100%;
          height: 190px;
          object-fit: cover;
          border-radius: 22px;
          margin-bottom: 16px;
        }

        .progress {
          height: 8px;
          background: rgba(255, 255, 255, 0.08);
          border-radius: 999px;
          overflow: hidden;
          margin-top: 18px;
        }

        .progressInner {
          height: 100%;
          width: 45%;
          background: linear-gradient(135deg, #ec4899, #8b5cf6);
          border-radius: 999px;
          animation: pulseWidth 2.4s infinite ease-in-out;
        }

        @keyframes pulseWidth {
          0% {
            width: 25%;
          }
          50% {
            width: 72%;
          }
          100% {
            width: 25%;
          }
        }

        .queuePanel {
          padding: 24px;
          min-height: 560px;
        }

        .queueHeader {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .queueList {
          display: grid;
          gap: 12px;
          max-height: 720px;
          overflow-y: auto;
          padding-right: 4px;
        }

        .queueCard {
          display: flex;
          gap: 12px;
          background: rgba(30, 41, 59, 0.76);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 18px;
          padding: 12px;
          animation: fadeIn 0.22s ease-out;
        }

        .queueCard:hover {
          background: rgba(51, 65, 85, 0.78);
        }

        .queueFlash {
          animation: glowFlash 0.9s ease-out;
        }

        @keyframes glowFlash {
          0% {
            box-shadow: 0 0 0 rgba(34, 197, 94, 0);
          }
          30% {
            box-shadow: 0 0 36px rgba(34, 197, 94, 0.28);
          }
          100% {
            box-shadow: 0 0 0 rgba(34, 197, 94, 0);
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .queueThumb {
          width: 86px;
          height: 58px;
          object-fit: cover;
          border-radius: 12px;
          flex-shrink: 0;
        }

        .userBadge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 5px 9px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 900;
          background: rgba(255, 255, 255, 0.07);
        }

        .likeButton {
          margin-top: 8px;
          padding: 8px 10px;
          border-radius: 12px;
          border: none;
          background: rgba(255, 255, 255, 0.08);
          color: white;
          cursor: pointer;
          font-weight: 800;
        }

        .communityGrid {
          display: grid;
          grid-template-columns: 1fr 1fr 360px;
          gap: 20px;
          align-items: start;
        }

        .communityPanel {
          padding: 24px;
          min-height: 420px;
        }

        .rankItem {
          padding: 14px;
          border-radius: 16px;
          background: rgba(30, 41, 59, 0.76);
          margin-bottom: 10px;
        }

        .noticeCard {
          padding: 18px;
          border-radius: 18px;
          background: rgba(99, 102, 241, 0.12);
          color: #c4b5fd;
          font-weight: 800;
          line-height: 1.6;
        }

        @media (max-width: 1100px) {
          .page {
            padding: 24px 14px;
          }

          .title {
            font-size: 34px;
          }

          .layout,
          .communityGrid {
            grid-template-columns: 1fr;
          }

          .searchRow {
            flex-direction: column;
          }

          .button {
            width: 100%;
          }

          .resultCard {
            flex-direction: column;
          }

          .resultThumb {
            width: 100%;
            height: auto;
            aspect-ratio: 16 / 9;
          }

          .nowThumb {
            height: auto;
            aspect-ratio: 16 / 9;
          }
        }

        @media (max-width: 560px) {
          .header,
          .mainPanel,
          .queuePanel,
          .nowPlaying,
          .nowIdle,
          .communityPanel {
            padding: 20px;
            border-radius: 22px;
          }

          .title {
            font-size: 30px;
          }

          .subtitle {
            font-size: 14px;
          }

          .tabBar {
            width: 100%;
            display: grid;
            grid-template-columns: 1fr 1fr;
          }

          .tabButton {
            padding: 12px 10px;
          }

          .queueCard {
            align-items: flex-start;
          }

          .queueThumb {
            width: 74px;
            height: 52px;
          }
        }
      `}</style>

      <div className="container">
        <section className="header glass">
          <p className="eyebrow">CHZZK MUSIC REQUEST</p>

          <h1 className="title">🎵 신청곡 접수</h1>

          <p className="subtitle">원하는 노래를 검색하고 방송에 신청하세요.</p>

          <div className="statusRow">
            <div className={`pill ${isRequestOpen ? "pillOpen" : "pillClosed"}`}>
              ● {isRequestOpen ? "신청 가능" : "신청 마감"}
            </div>

            {closeCountdown && (
              <div className="pill pillInfo">⏱ 마감까지 {closeCountdown}</div>
            )}

            <div className="pill pillInfo">
              ⏳ 최대 {Math.floor(maxDurationSec / 60)}분 신청 가능
            </div>
          </div>
        </section>

        <div className="tabBar">
          <button
            className={`tabButton ${activeTab === "request" ? "tabButtonActive" : ""}`}
            onClick={() => setActiveTab("request")}
          >
            신청하기
          </button>

          <button
            className={`tabButton ${activeTab === "community" ? "tabButtonActive" : ""}`}
            onClick={() => setActiveTab("community")}
          >
            커뮤니티
          </button>
        </div>

        {activeTab === "request" ? (
          <div className="layout">
            <section className="mainPanel glass">
              <h2 style={{ marginTop: 0, fontSize: "26px" }}>노래 검색</h2>

              <input
                className="input"
                value={requester}
                onChange={(e) => {
                  setRequester(e.target.value);
                  localStorage.setItem("requesterName", e.target.value);
                }}
                placeholder="닉네임"
              />

              <div className="searchRow">
                <input
                  className="input"
                  value={song}
                  onChange={(e) => setSong(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") searchYoutube();
                  }}
                  placeholder="노래 제목 또는 유튜브 링크 입력"
                  style={{ marginBottom: 0 }}
                />

                <button
                  className="button"
                  disabled={!isRequestOpen}
                  onClick={searchYoutube}
                >
                  {!isRequestOpen ? "마감" : isSearching ? "검색 중..." : "검색"}
                </button>
              </div>

              {message && (
                <div
                  className={`message ${
                    message.startsWith("❌") ? "messageError" : "messageOk"
                  }`}
                >
                  {message}
                </div>
              )}

              <section className="resultList">
                {results.length === 0 ? (
                  <div className="emptyBox">검색 결과가 여기에 표시됩니다.</div>
                ) : (
                  results.map((item) => (
                    <div key={item.videoId} className="resultCard">
                      <img className="resultThumb" src={item.thumbnail} alt={item.title} />

                      <div style={{ flex: 1 }}>
                        <h3 style={{ margin: "0 0 8px", fontSize: "18px", lineHeight: 1.4 }}>
                          {item.title}
                        </h3>

                        <p style={{ color: "#94a3b8", margin: "0 0 10px" }}>
                          {item.channelTitle}
                        </p>

                        <p style={{ color: "#cbd5e1", margin: "0 0 14px" }}>
                          ⏱ {formatDuration(item.durationSec)}
                        </p>

                        <button className="button" onClick={() => submitSong(item)}>
                          🎵 이 곡 신청
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </section>
            </section>

            <aside className="sidePanel">
              <section className={`glass ${currentSong ? "nowPlaying" : "nowIdle"}`}>
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
                        className="nowThumb"
                        src={getThumbnail(currentSong)!}
                        alt={getTitle(currentSong)}
                      />
                    )}

                    <h3 style={{ margin: "0 0 10px", lineHeight: 1.45 }}>
                      {getTitle(currentSong)}
                    </h3>

                    <span
                      className="userBadge"
                      style={{ color: getUserColor(currentSong.requester) }}
                    >
                      👤 {currentSong.requester}
                    </span>

                    <div className="progress">
                      <div className="progressInner" />
                    </div>
                  </div>
                ) : (
                  <div className="emptyBox" style={{ height: "140px" }}>
                    현재 재생 중인 곡이 없습니다.
                  </div>
                )}
              </section>

              <section className={`queuePanel glass ${newQueueFlash ? "queueFlash" : ""}`}>
                <div className="queueHeader">
                  <div>
                    <p style={{ color: "#a5b4fc", margin: "0 0 8px", fontWeight: 800 }}>
                      QUEUE
                    </p>

                    <h2 style={{ margin: 0, fontSize: "22px" }}>신청곡 대기열</h2>
                  </div>

                  <strong className="pill pillInfo">{queue.length}곡</strong>
                </div>

                {queue.length === 0 ? (
                  <div className="emptyBox" style={{ height: "430px" }}>
                    아직 대기 중인 신청곡이 없습니다.
                  </div>
                ) : (
                  <div className="queueList">
                    {queue.map((item, index) => {
                      const thumbnail = getThumbnail(item);
                      const isLiked = likedSongIds.includes(item.id);

                      return (
                        <div key={item.id} className="queueCard">
                          {thumbnail ? (
                            <img className="queueThumb" src={thumbnail} alt={getTitle(item)} />
                          ) : (
                            <div className="queueThumb" />
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
                              #{index + 1} · ⏱ {formatDuration(item.duration_sec)}
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

                            <span
                              className="userBadge"
                              style={{ color: getUserColor(item.requester) }}
                            >
                              👤 {item.requester}
                            </span>

                            <br />

                            <button
                              className="likeButton"
                              onClick={() => toggleLike(item.id)}
                            >
                              {isLiked ? "💜" : "🤍"} {likes[item.id] ?? 0}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            </aside>
          </div>
        ) : (
          <div className="communityGrid">
            <section className="communityPanel glass">
              <p className="eyebrow">POPULAR</p>

              <h2 style={{ marginTop: 0 }}>🔥 인기 신청곡</h2>

              {popularSongs.length === 0 ? (
                <div className="emptyBox">아직 인기 신청곡이 없습니다.</div>
              ) : (
                popularSongs.map((item, index) => (
                  <div key={item.id} className="rankItem">
                    <strong>
                      #{index + 1} {getTitle(item)}
                    </strong>

                    <p style={{ color: "#94a3b8", margin: "8px 0" }}>
                      신청자: {item.requester}
                    </p>

                    <button className="likeButton" onClick={() => toggleLike(item.id)}>
                      {likedSongIds.includes(item.id) ? "💜" : "🤍"}{" "}
                      {likes[item.id] ?? 0}
                    </button>
                  </div>
                ))
              )}
            </section>

            <section className="communityPanel glass">
              <p className="eyebrow">REQUESTER RANKING</p>

              <h2 style={{ marginTop: 0 }}>🏆 오늘의 신청자</h2>

              {requesterRanking.length === 0 ? (
                <div className="emptyBox">아직 신청자 기록이 없습니다.</div>
              ) : (
                requesterRanking.map(([name, count], index) => (
                  <div key={name} className="rankItem">
                    <strong style={{ color: getUserColor(name) }}>
                      #{index + 1} {name}
                    </strong>

                    <p style={{ color: "#94a3b8", margin: "8px 0 0" }}>
                      신청 {count}회
                    </p>
                  </div>
                ))
              )}
            </section>

            <section className="communityPanel glass">
              <p className="eyebrow">NOTICE</p>

              <h2 style={{ marginTop: 0 }}>📢 신청 안내</h2>

              <div className="noticeCard">
                현재 최대 신청 가능 길이는 {Math.floor(maxDurationSec / 60)}분입니다.
                <br />
                같은 곡은 중복 신청할 수 없습니다.
                <br />
                관리자 설정에 따라 일부 단어/채널은 차단될 수 있습니다.
              </div>

              <div style={{ height: 16 }} />

              <div className="noticeCard">
                {isRequestOpen
                  ? "지금은 신청곡을 받고 있어요."
                  : "현재 신청곡 접수가 마감되었습니다."}
                {closeCountdown ? ` 마감까지 ${closeCountdown} 남았습니다.` : ""}
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}