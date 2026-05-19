"use client";

import { useEffect, useRef, useState } from "react";

type SongRequest = {
  id: number;
  requester: string;
  song: string;
};

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

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

export default function PlayerPage() {
  const playerRef = useRef<any>(null);

  const [currentSong, setCurrentSong] = useState<SongRequest | null>(null);
  const [videoId, setVideoId] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isActivated, setIsActivated] = useState(false);

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

  async function loadSong() {
    const res = await fetch("/api/songs");
    const data = await res.json();

    setCurrentSong(data.currentSong ?? null);

    if (data.currentSong) {
      setVideoId(getYoutubeId(data.currentSong.song));
    } else {
      setVideoId(null);
    }
  }

  async function playNext() {
    await fetch("/api/songs", {
      method: "POST",
      body: JSON.stringify({ action: "next" }),
    });

    await loadSong();
  }

  async function skipSong() {
  await fetch("/api/songs", {
    method: "POST",
    body: JSON.stringify({ action: "skip" }),
  });

  await loadSong();
}

  useEffect(() => {
    if (!isLoggedIn) return;

    loadSong();

    const timer = setInterval(loadSong, 1000);

    return () => clearInterval(timer);
  }, [isLoggedIn]);

  useEffect(() => {
    if (!isLoggedIn) return;

    if (window.YT) {
      setIsReady(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    document.body.appendChild(script);

    window.onYouTubeIframeAPIReady = () => {
      setIsReady(true);
    };
  }, [isLoggedIn]);

  useEffect(() => {
    if (!isReady || !videoId || !isActivated) return;

    if (!playerRef.current) {
      playerRef.current = new window.YT.Player("youtube-player", {
        width: "100%",
        height: "100%",
        videoId,
        playerVars: {
          autoplay: 1,
          controls: 1,
        },
        events: {
          onReady: (event: any) => {
            event.target.playVideo();
          },
          onStateChange: async (event: any) => {
            if (event.data === window.YT.PlayerState.ENDED) {
              await playNext();
            }
          },
        },
      });
    } else {
      playerRef.current.loadVideoById(videoId);
    }
  }, [isReady, videoId, isActivated]);

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
            CHZZK PLAYER
          </p>

          <h1 style={{ marginTop: 0, marginBottom: "28px", fontSize: "38px" }}>
            🔐 플레이어 로그인
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
        width: "100vw",
        height: "100vh",
        background: "black",
        color: "white",
        overflow: "hidden",
      }}
    >
      {!isActivated && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.92)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
          }}
        >
          <h1 style={{ fontSize: "48px" }}>🎵 신청곡 플레이어</h1>

          <p style={{ color: "#cbd5e1", marginBottom: "30px" }}>
            방송 시작 전에 한 번 클릭해주세요.
          </p>

          <button
            onClick={() => setIsActivated(true)}
            style={{
              padding: "20px 36px",
              borderRadius: "20px",
              border: "none",
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              color: "white",
              fontWeight: 800,
              fontSize: "22px",
              cursor: "pointer",
            }}
          >
            ▶️ 플레이어 시작
          </button>
        </div>
      )}

      <div
  style={{
    position: "fixed",
    top: "20px",
    right: "20px",
    zIndex: 9998,
    display: "flex",
    gap: "10px",
  }}
>
  <button
    onClick={playNext}
    style={{
      padding: "12px 18px",
      borderRadius: "14px",
      border: "none",
      background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
      color: "white",
      fontWeight: 800,
      cursor: "pointer",
    }}
  >
    ▶️ 재생
  </button>

  <button
    onClick={skipSong}
    style={{
      padding: "12px 18px",
      borderRadius: "14px",
      border: "none",
      background: "linear-gradient(135deg, #ef4444, #dc2626)",
      color: "white",
      fontWeight: 800,
      cursor: "pointer",
    }}
  >
    ⏭️ 스킵
  </button>
</div>

      {currentSong && videoId ? (
        <div
          id="youtube-player"
          style={{
            width: "100vw",
            height: "100vh",
          }}
        />
      ) : (
        <div
          style={{
            width: "100vw",
            height: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "32px",
            fontWeight: 700,
          }}
        >
          현재 재생 중인 곡 없음
        </div>
      )}
    </main>
  );
}