import { NextRequest, NextResponse } from "next/server";
import { signSession, COOKIE_NAME } from "@/lib/auth";

const VIEWER_USERNAME = process.env.VIEWER_USERNAME ?? "viewer";
const VIEWER_PASSWORD = process.env.VIEWER_PASSWORD ?? "viewer123";

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    if (
      typeof username !== "string" ||
      typeof password !== "string" ||
      username.trim() !== VIEWER_USERNAME ||
      password !== VIEWER_PASSWORD
    ) {
      return NextResponse.json(
        { error: "Invalid username or password" },
        { status: 401 },
      );
    }

    const token = await signSession(username.trim(), "viewer");

    const response = NextResponse.json({ success: true });
    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 8 * 60 * 60,
      secure: process.env.NODE_ENV === "production",
    });
    return response;
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
