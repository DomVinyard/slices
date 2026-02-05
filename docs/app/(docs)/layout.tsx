import { Nav } from "@/components/nav";

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <header className="border-b border-zinc-200">
        <div className="max-w-5xl mx-auto px-6 py-6">
          <Nav />
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-6 py-12 md:py-16">{children}</main>
    </>
  );
}
