'use client';

import { clsx } from 'clsx';
import { FileCard } from './file-card';
import type { TTFile } from '@/app/demo/viewer/lib/models';

interface ShelfProps {
  files: TTFile[];
  title?: string;
  emptyMessage?: string;
  className?: string;
}

export function Shelf({ files, title, emptyMessage = 'No files found', className }: ShelfProps) {
  if (files.length === 0) {
    return (
      <div className={clsx('text-center py-12', className)}>
        <p className="text-tt-muted">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={className}>
      {title && (
        <h2 className="text-lg font-semibold text-tt-text mb-4">{title}</h2>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {files.map((file) => (
          <FileCard key={file.id} file={file} showLinks />
        ))}
      </div>
    </div>
  );
}
