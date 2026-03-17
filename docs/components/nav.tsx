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
          className="font-semibold text-zinc-100 hover:text-indigo-400 transition-colors"
        >
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
