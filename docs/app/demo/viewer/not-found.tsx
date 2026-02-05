import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
      <h1 className="text-4xl font-bold text-tt-text mb-4">404</h1>
      <p className="text-tt-muted mb-6">File not found</p>
      <Link
        href="/demo/viewer"
        className="px-4 py-2 rounded-lg bg-tt-accent text-white hover:bg-tt-accent/80 transition-colors"
      >
        Back to Shelf
      </Link>
    </div>
  );
}
