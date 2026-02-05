'use client';

import Link from 'next/link';
import { clsx } from 'clsx';
import type { TTFile } from '@/app/demo/viewer/lib/models';

interface TimelineViewProps {
  files: TTFile[];
  className?: string;
}

interface GroupedFiles {
  date: string;
  files: TTFile[];
}

function groupByDate(files: TTFile[]): GroupedFiles[] {
  const groups = new Map<string, TTFile[]>();

  for (const file of files) {
    // Try to extract date from created_at or from ULID timestamp
    let date: string;
    
    if (file.frontmatter.created_at) {
      date = new Date(file.frontmatter.created_at).toISOString().split('T')[0];
    } else {
      // Extract timestamp from ULID (first 10 chars are timestamp)
      try {
        const timestamp = decodeULIDTimestamp(file.id);
        date = new Date(timestamp).toISOString().split('T')[0];
      } catch {
        date = 'Unknown';
      }
    }

    if (!groups.has(date)) {
      groups.set(date, []);
    }
    groups.get(date)!.push(file);
  }

  // Sort by date descending
  return Array.from(groups.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, files]) => ({ date, files }));
}

// Decode ULID timestamp (first 10 chars are base32 encoded timestamp)
function decodeULIDTimestamp(ulid: string): number {
  const chars = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  const timestampPart = ulid.slice(0, 10).toUpperCase();
  
  let timestamp = 0;
  for (const char of timestampPart) {
    const index = chars.indexOf(char);
    if (index === -1) throw new Error('Invalid ULID character');
    timestamp = timestamp * 32 + index;
  }
  
  return timestamp;
}

function formatDate(dateStr: string): string {
  if (dateStr === 'Unknown') return dateStr;
  
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function TimelineView({ files, className }: TimelineViewProps) {
  const groups = groupByDate(files);

  if (files.length === 0) {
    return (
      <div className={clsx('text-center py-12', className)}>
        <p className="text-tt-muted">No files found</p>
      </div>
    );
  }

  return (
    <div className={clsx('relative', className)}>
      {/* Timeline line */}
      <div className="absolute left-4 top-0 bottom-0 w-px bg-tt-border" />

      <div className="space-y-8">
        {groups.map(({ date, files }) => (
          <div key={date} className="relative">
            {/* Date marker */}
            <div className="flex items-center gap-4 mb-4">
              <div className="w-8 h-8 rounded-full bg-tt-accent/20 border-2 border-tt-accent flex items-center justify-center z-10">
                <div className="w-2 h-2 rounded-full bg-tt-accent" />
              </div>
              <h3 className="text-lg font-semibold text-tt-text">
                {formatDate(date)}
              </h3>
              <span className="text-sm text-tt-muted">
                ({files.length} {files.length === 1 ? 'file' : 'files'})
              </span>
            </div>

            {/* Files for this date */}
            <div className="ml-12 space-y-3">
              {files.map((file) => (
                <Link
                  key={file.id}
                  href={`/demo/viewer/${file.id}`}
                  className="block p-3 rounded-lg border border-tt-border bg-tt-surface hover:border-tt-accent/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-tt-text font-medium truncate">
                        {file.frontmatter.title}
                      </h4>
                      {file.frontmatter.summary && (
                        <p className="text-sm text-tt-muted line-clamp-1 mt-1">
                          {file.frontmatter.summary}
                        </p>
                      )}
                    </div>
                    <span className={clsx(
                      'text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0',
                      file.frontmatter.kind === 'pointer'
                        ? 'bg-amber-500/20 text-amber-400'
                        : 'bg-emerald-500/20 text-emerald-400'
                    )}>
                      {file.frontmatter.kind || 'context'}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
