'use client';

import Link from 'next/link';
import { clsx } from 'clsx';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumb({ items, className }: BreadcrumbProps) {
  return (
    <nav className={clsx('flex items-center gap-2 text-sm', className)}>
      {items.map((item, index) => (
        <span key={index} className="flex items-center gap-2">
          {index > 0 && <span className="text-tt-muted">/</span>}
          {item.href ? (
            <Link
              href={item.href}
              className="text-tt-muted hover:text-tt-accent transition-colors"
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-tt-text">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
