import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "slices.info",
  description: "A file-based memory format for AI agents",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-white text-zinc-900 min-h-screen">
        {children}
      </body>
    </html>
  );
}
