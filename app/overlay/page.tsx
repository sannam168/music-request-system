"use client";

import { useEffect, useState } from "react";

type SongRequest = {
  id: number;
  requester: string;
  song: string;
};

export default function OverlayPage() {
  const [currentSong, setCurrentSong] = useState<SongRequest | null>(null);

  async function loadSong() {
    const res = await fetch("/api/songs");
    const data = await res.json();

    setCurrentSong(data.currentSong);
  }

  useEffect(() => {
    loadSong();

    const timer = setInterval(loadSong, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <main
      style={{
        width: "100vw",
        height: "100vh",
        background: "transparent",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        paddingBottom: "60px",
        pointerEvents: "none",
      }}
    >
      {currentSong && (
        <div
          style={{
            background: "rgba(0,0,0,0.7)",
            color: "white",
            padding: "20px 28px",
            borderRadius: "16px",
            minWidth: "500px",
            backdropFilter: "blur(10px)",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          <p
            style={{
              fontSize: "14px",
              opacity: 0.7,
              marginBottom: "6px",
            }}
          >
            🎵 현재 재생 중
          </p>

          <h1
            style={{
              fontSize: "28px",
              margin: 0,
            }}
          >
            {currentSong.song}
          </h1>

          <p
            style={{
              marginTop: "8px",
              opacity: 0.8,
            }}
          >
            신청자: {currentSong.requester}
          </p>
        </div>
      )}
    </main>
  );
}