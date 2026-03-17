"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function Nav() {
  const pathname = usePathname();

  const linkClass = (prefix: string) =>
    `transition-colors ${
      pathname.startsWith(prefix)
        ? "text-zinc-100"
        : "text-zinc-400 hover:text-zinc-100"
    }`;

  return (
    <nav className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link
          href="/"
          className="font-semibold text-zinc-100 hover:text-indigo-400 transition-colors flex items-center gap-1.5 group"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 64 64"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="opacity-70 group-hover:opacity-100 transition-opacity"
          >
            <defs>
              <filter id="nav-neon" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <g transform="rotate(-18 32 32)">
              <path
                d="M32 56 L12 16 A26 26 0 0 1 52 16Z"
                fill="#1e1b4b"
                stroke="#818cf8"
                strokeWidth="2.5"
                strokeLinejoin="round"
                filter="url(#nav-neon)"
              />
              <path
                d="M15.5 19.5 A22 22 0 0 1 48.5 19.5 L52 16 A26 26 0 0 0 12 16Z"
                fill="#a78bfa"
                opacity="0.2"
              />
              <circle cx="30" cy="32" r="3.5" fill="#f472b6" opacity="0.8" filter="url(#nav-neon)" />
              <circle cx="38" cy="24" r="2.5" fill="#fb923c" opacity="0.8" filter="url(#nav-neon)" />
              <circle cx="27" cy="42" r="2.5" fill="#f472b6" opacity="0.7" filter="url(#nav-neon)" />
            </g>
          </svg>
          slices
        </Link>
        <div className="flex items-center gap-6 text-sm">
          <Link href="/spec" className={linkClass("/spec")}>
            spec
          </Link>
          <Link href="/resources" className={linkClass("/resources")}>
            skill
          </Link>
        </div>
      </div>
    </nav>
  );
}
