import { Nav } from './components/nav';

export const metadata = {
  title: 'TreeText Viewer Demo',
  description: 'Interactive demo of the TreeText memory viewer',
};

export default function ViewerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="viewer-theme min-h-screen bg-tt-bg text-tt-text">
      <Nav />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
