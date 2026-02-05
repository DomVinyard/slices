"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { SearchBox } from "./search-box";

const NAV_ITEMS = [
  { href: "/demo/viewer", label: "Shelf" },
  { href: "/demo/viewer/graph", label: "Graph" },
  { href: "/demo/viewer/timeline", label: "Timeline" },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-50 bg-tt-bg/95 backdrop-blur border-b border-tt-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 gap-4">
          {/* Logo */}
          <Link
            href="/demo/viewer"
            className="flex items-center gap-2 shrink-0"
          >
            <span className="text-2xl">🌳</span>
            <span className="font-semibold text-tt-text hidden sm:block">
              TreeText Viewer
            </span>
          </Link>

          {/* Nav links */}
          <div className="flex items-center gap-1">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "px-3 py-1.5 rounded-md text-sm transition-colors",
                  pathname === item.href ||
                    pathname?.startsWith(item.href + "/")
                    ? "bg-tt-surface text-tt-text font-medium"
                    : "text-tt-muted hover:text-tt-text hover:bg-tt-surface"
                )}
              >
                {item.label}
              </Link>
            ))}
          </div>

          {/* Search */}
          <SearchBox className="w-64 hidden md:block" />
          <a
            href="/"
            className="text-sm text-tt-muted hover:text-tt-accent transition-colors hidden sm:block"
          >
            ← Docs
          </a>
        </div>
      </div>
    </nav>
  );
}
