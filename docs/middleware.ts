import { NextRequest, NextResponse } from 'next/server';

const AGENT_PATTERNS = [
  'curl/',
  'wget/',
  'httpie/',
  'python-requests/',
  'python-httpx/',
  'node-fetch/',
  'go-http-client/',
  'ruby/',
  'anthropic/',
  'openai/',
  'claudebot',
  'gptbot',
  'chatgpt',
  'perplexitybot',
  'cohere-ai',
];

export function middleware(request: NextRequest) {
  // Only intercept docs pages, not /agents, /llms.txt, /demo, or static assets
  const path = request.nextUrl.pathname;
  if (
    path.startsWith('/agents') ||
    path.startsWith('/llms.txt') ||
    path.startsWith('/demo') ||
    path.startsWith('/_next') ||
    path.startsWith('/api')
  ) {
    return NextResponse.next();
  }

  const ua = (request.headers.get('user-agent') || '').toLowerCase();
  const accept = request.headers.get('accept') || '';

  // Redirect if the client is a known agent/bot
  const isAgent = AGENT_PATTERNS.some((p) => ua.includes(p));

  // Redirect if the client explicitly wants plain text or markdown (not a browser)
  const wantsMachineReadable =
    (accept.includes('text/plain') || accept.includes('text/markdown')) &&
    !accept.includes('text/html');

  if (isAgent || wantsMachineReadable) {
    return NextResponse.redirect(new URL('/llms.txt', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
