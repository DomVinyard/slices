import Link from "next/link";

export function Nav() {
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
          <Link
            href="/spec"
            className="text-zinc-400 hover:text-zinc-100 transition-colors"
          >
            spec
          </Link>
          <Link
            href="/resources"
            className="text-zinc-400 hover:text-zinc-100 transition-colors"
          >
            skill
          </Link>
        </div>
      </div>
    </nav>
  );
}
