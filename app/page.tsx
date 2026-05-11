import Link from "next/link";

export default function Home() {
  return (
    <main style={{ minHeight: "100vh", padding: 40 }}>
      <h1>치지직 신청곡 시스템</h1>

      <ul>
        <li>
          <Link href="/request">신청자 페이지</Link>
        </li>
        <li>
          <Link href="/admin">관리자 페이지</Link>
        </li>
        <li>
          <Link href="/player">재생 페이지</Link>
        </li>
      </ul>
    </main>
  );
}