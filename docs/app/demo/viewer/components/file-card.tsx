'use client';

import Link from 'next/link';
import { clsx } from 'clsx';
import type { TTFile } from '@/app/demo/viewer/lib/models';

interface FileCardProps {
  file: TTFile;
  showLinks?: boolean;
  className?: string;
}

export function FileCard({ file, showLinks = false, className }: FileCardProps) {
  const { frontmatter, id } = file;
  const kind = frontmatter.kind || 'context';
  
  const kindBadgeColor = kind === 'pointer'
    ? 'bg-amber-500/20 text-amber-400'
    : 'bg-emerald-500/20 text-emerald-400';

  return (
    <Link
      href={`/demo/viewer/${id}`}
      className={clsx(
        'group block p-4 rounded-lg border border-tt-border bg-tt-surface',
        'hover:border-tt-accent/50 hover:bg-tt-surface/80 transition-all',
        className
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="text-tt-text font-medium group-hover:text-tt-accent transition-colors line-clamp-1">
          {frontmatter.title}
        </h3>
        <span className={clsx('text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0', kindBadgeColor)}>
          {kind}
        </span>
      </div>
      
      {frontmatter.summary && (
        <p className="text-sm text-tt-muted line-clamp-2 mb-3">
          {frontmatter.summary}
        </p>
      )}
      
      {frontmatter.contract?.purpose && !frontmatter.summary && (
        <p className="text-sm text-tt-muted line-clamp-2 mb-3 italic">
          {frontmatter.contract.purpose}
        </p>
      )}
      
      <div className="flex items-center justify-between text-xs text-tt-muted">
        <span className="font-mono opacity-60 truncate">{id.slice(0, 12)}...</span>
        {showLinks && frontmatter.links && frontmatter.links.length > 0 && (
          <span className="flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            {frontmatter.links.length}
          </span>
        )}
      </div>
    </Link>
  );
}
