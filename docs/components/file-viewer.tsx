"use client";

import { useState } from "react";

interface FileEntry {
  name: string;
  tab?: string;
  content: string;
  rawHref: string;
}

function FileIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="currentColor"
      className="shrink-0"
    >
      <path d="M3.75 1.5a.25.25 0 00-.25.25v12.5c0 .138.112.25.25.25h8.5a.25.25 0 00.25-.25V6H9.75A1.75 1.75 0 018 4.25V1.5H3.75zm5.75.56v2.19c0 .138.112.25.25.25h2.19L9.5 2.06zM2 1.75C2 .784 2.784 0 3.75 0h5.086c.464 0 .909.184 1.237.513l3.414 3.414c.329.328.513.773.513 1.237v9.086A1.75 1.75 0 0112.25 16h-8.5A1.75 1.75 0 012 14.25V1.75z" />
    </svg>
  );
}

function highlightYamlLine(line: string): React.ReactNode {
  if (line.startsWith("---")) {
    return <span className="text-zinc-500">{line}</span>;
  }
  if (line.startsWith("#")) {
    return <span className="text-zinc-400">{line}</span>;
  }

  const keyMatch = line.match(/^(\s*)([\w._-]+)(\s*:\s*)(.*)/);
  if (keyMatch) {
    const [, indent, key, sep, value] = keyMatch;
    let valueEl: React.ReactNode = <span className="text-zinc-300">{value}</span>;
    if (value.startsWith('"') || value.startsWith("'")) {
      valueEl = <span className="text-emerald-400">{value}</span>;
    } else if (["perpetual", "snapshot", "ephemeral", "fresh", "stale", "expired", "context", "pointer", "index", "markdown", "jsonl", "text", "code", "yaml", "none", "append", "replace", "immutable", "project", "personal", "team", "agent", "human", "both"].includes(value.trim())) {
      valueEl = <span className="text-amber-400">{value}</span>;
    } else if (value.startsWith("[")) {
      valueEl = <span className="text-zinc-300">{value}</span>;
    }
    return (
      <>
        <span>{indent}</span>
        <span className="text-indigo-400">{key}</span>
        <span className="text-zinc-500">{sep}</span>
        {valueEl}
      </>
    );
  }

  if (line.trim().startsWith("- ")) {
    return <span className="text-zinc-300">{line}</span>;
  }

  if (line.trim().startsWith("```")) {
    return <span className="text-zinc-500">{line}</span>;
  }

  return <span className="text-zinc-300">{line}</span>;
}

function LineNumbers({ count }: { count: number }) {
  return (
    <div className="select-none text-right pr-4 text-zinc-600 text-xs leading-5 pt-4 pb-4 shrink-0 border-r border-zinc-800">
      {Array.from({ length: count }, (_, i) => (
        <div key={i}>{i + 1}</div>
      ))}
    </div>
  );
}

export function FileViewer({ files }: { files: FileEntry[] }) {
  const [activeFile, setActiveFile] = useState(0);
  const file = files[activeFile];
  const lines = file.content.split("\n");

  return (
    <div className="border border-zinc-800 rounded-lg overflow-hidden bg-zinc-950">
      <div className="flex border-b border-zinc-800 bg-zinc-900/50 overflow-x-auto">
        {files.map((f, i) => (
          <button
            key={f.name}
            onClick={() => setActiveFile(i)}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-mono border-r border-zinc-800 transition-colors whitespace-nowrap ${
              i === activeFile
                ? "bg-zinc-950 text-zinc-100 border-b-2 border-b-indigo-500"
                : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900"
            }`}
          >
            <FileIcon />
            {f.tab || f.name}
          </button>
        ))}
        <div className="flex-1" />
        <a
          href={file.rawHref}
          className="flex items-center px-4 text-xs text-zinc-500 hover:text-zinc-300 transition-colors whitespace-nowrap"
          download
        >
          raw
        </a>
      </div>

      <div className="flex overflow-auto max-h-[70vh] font-mono text-xs leading-5">
        <LineNumbers count={lines.length} />
        <pre className="flex-1 p-4 whitespace-pre-wrap break-words">
          {lines.map((line, i) => (
            <div key={i}>{highlightYamlLine(line) || "\u00A0"}</div>
          ))}
        </pre>
      </div>

      <div className="border-t border-zinc-800 px-4 py-2 flex items-center justify-between text-xs text-zinc-500 bg-zinc-900/30">
        <span>{lines.length} lines</span>
        <span className="font-mono">{file.name}</span>
      </div>
    </div>
  );
}
