import fs from "fs";
import path from "path";
import { Nav } from "@/components/nav";
import { FileViewer } from "@/components/file-viewer";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Resources — slices",
  description: "Browse the files installed by slices",
};

function loadFile(name: string) {
  const filePath = path.join(process.cwd(), "content", name);
  return fs.readFileSync(filePath, "utf8");
}

export default function ResourcesPage() {
  const files = [
    { name: "SKILL.md", content: loadFile("skill.md") },
    { name: "SPEC.md", content: loadFile("spec.md") },
  ];

  return (
    <>
      <Nav />
      <main className="max-w-6xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-xl font-semibold text-zinc-100 mb-2">
            Installed Resources
          </h1>
          <p className="text-sm text-zinc-400">
            These files are installed to your skills directory by{" "}
            <code className="text-indigo-300 bg-zinc-800 px-1.5 py-0.5 rounded text-xs">
              curl -fsSL slices.info/install | sh
            </code>
          </p>
        </div>
        <FileViewer files={files} />
      </main>
    </>
  );
}
