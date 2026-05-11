import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json();

  const password = body.password;

  if (password === process.env.ADMIN_PASSWORD) {
    return NextResponse.json({
      success: true,
    });
  }

  return NextResponse.json({
    success: false,
  });
}