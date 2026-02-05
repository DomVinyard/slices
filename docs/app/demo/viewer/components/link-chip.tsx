'use client';

import Link from 'next/link';
import { clsx } from 'clsx';

interface LinkChipProps {
  rel: string;
  targetId: string;
  targetTitle?: string;
  direction?: 'incoming' | 'outgoing';
  className?: string;
}

const REL_COLORS: Record<string, string> = {
  depends_on: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  implements: 'bg-green-500/20 text-green-400 border-green-500/30',
  extends: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  related: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  references: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  supersedes: 'bg-red-500/20 text-red-400 border-red-500/30',
  derived_from: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
};

const DEFAULT_COLOR = 'bg-gray-500/20 text-gray-400 border-gray-500/30';

export function LinkChip({
  rel,
  targetId,
  targetTitle,
  direction = 'outgoing',
  className,
}: LinkChipProps) {
  const colorClass = REL_COLORS[rel] || DEFAULT_COLOR;
  const arrow = direction === 'outgoing' ? '→' : '←';

  return (
    <Link
      href={`/demo/viewer/${targetId}`}
      className={clsx(
        'inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs border transition-all hover:scale-105',
        colorClass,
        className
      )}
    >
      <span className="opacity-70">{arrow}</span>
      <span className="font-medium">{rel}</span>
      <span className="opacity-70 truncate max-w-[150px]">
        {targetTitle || targetId}
      </span>
    </Link>
  );
}
