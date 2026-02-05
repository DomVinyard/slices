'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { clsx } from 'clsx';

interface SearchBoxProps {
  initialQuery?: string;
  className?: string;
}

export function SearchBox({ initialQuery = '', className }: SearchBoxProps) {
  const [query, setQuery] = useState(initialQuery);
  const router = useRouter();

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (query.trim()) {
        router.push(`/demo/viewer/search?q=${encodeURIComponent(query.trim())}`);
      }
    },
    [query, router]
  );

  return (
    <form onSubmit={handleSubmit} className={clsx('relative', className)}>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search memory..."
        className="w-full px-4 py-2 pr-10 rounded-lg border border-tt-border bg-tt-surface text-tt-text placeholder:text-tt-muted focus:outline-none focus:border-tt-accent focus:ring-1 focus:ring-tt-accent"
      />
      <button
        type="submit"
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-tt-muted hover:text-tt-accent transition-colors"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </button>
    </form>
  );
}
