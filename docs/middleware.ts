import { NextRequest, NextResponse } from "next/server";

const CLI_AGENTS = [
  "curl",
  "wget",
  "httpie",
  "python-requests",
  "python-urllib",
  "node-fetch",
  "undici",
];

const BOT_AGENTS = [
  "openai",
  "chatgpt",
  "gptbot",
  "claudebot",
  "anthropic",
  "perplexity",
  "cohere",
  "google-extended",
  "bingbot",
];

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  if (
    path.startsWith("/install") ||
    path.startsWith("/skill") ||
    path.startsWith("/spec.md") ||
    path.startsWith("/llms.txt") ||
    path.startsWith("/spec") ||
    path.startsWith("/_next") ||
    path.startsWith("/api") ||
    path.includes(".")
  ) {
    return NextResponse.next();
  }

  const ua = (request.headers.get("user-agent") || "").toLowerCase();
  const accept = request.headers.get("accept") || "";

  const isCli = CLI_AGENTS.some((agent) => ua.includes(agent));
  const isBot = BOT_AGENTS.some((bot) => ua.includes(bot));
  const wantsPlainText =
    accept.includes("text/plain") || accept.includes("text/markdown");

  if (isCli || isBot || wantsPlainText) {
    return NextResponse.redirect(new URL("/install", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
