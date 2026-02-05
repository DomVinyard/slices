"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";

const links = [
  { href: "/", label: "Overview" },
  { href: "/getting-started", label: "Get Started" },
  { href: "/spec", label: "Specification" },
  { href: "/reference", label: "Tools" },
  { href: "/toolkit", label: "Toolkit" },
];

export function Nav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <nav>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="font-semibold text-lg tracking-tight">
            slices.info
          </Link>
          <div className="hidden md:flex gap-6 text-sm">
            {links.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`transition-colors ${
                  pathname === href
                    ? "text-zinc-900"
                    : "text-zinc-500 hover:text-zinc-900"
                }`}
              >
                {label}
              </Link>
            ))}
          </div>
        </div>

        <Link
          href="/demo/viewer"
          className="hidden md:block text-sm font-medium text-zinc-600 hover:text-zinc-900 transition-colors"
        >
          Demo →
        </Link>

        <button
          onClick={() => setOpen(true)}
          className="md:hidden p-2 -mr-2 text-zinc-600 hover:text-zinc-900"
          aria-label="Open menu"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/20 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-0 h-full w-64 bg-white shadow-xl border-l border-zinc-200">
            <div className="flex items-center justify-between p-6 border-b border-zinc-100">
              <span className="font-semibold text-lg tracking-tight">
                slices.info
              </span>
              <button
                onClick={() => setOpen(false)}
                className="p-2 -mr-2 text-zinc-400 hover:text-zinc-900"
                aria-label="Close menu"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <line x1="4" y1="4" x2="16" y2="16" />
                  <line x1="16" y1="4" x2="4" y2="16" />
                </svg>
              </button>
            </div>
            <div className="flex flex-col p-6 gap-4">
              {links.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  className={`text-base transition-colors ${
                    pathname === href
                      ? "text-zinc-900 font-medium"
                      : "text-zinc-500 hover:text-zinc-900"
                  }`}
                >
                  {label}
                </Link>
              ))}
              <hr className="border-zinc-100" />
              <Link
                href="/demo/viewer"
                onClick={() => setOpen(false)}
                className="text-base text-zinc-600 hover:text-zinc-900 transition-colors"
              >
                Demo →
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
