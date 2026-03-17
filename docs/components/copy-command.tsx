"use client";

import { useState } from "react";

export function CopyCommand({ command }: { command: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={copy}
      className="group relative w-full max-w-xl mx-auto block bg-zinc-900 border border-zinc-700 hover:border-indigo-500/50 rounded-lg px-6 py-4 text-left transition-all cursor-pointer"
    >
      <div className="flex items-center justify-between gap-4">
        <code className="text-indigo-300 font-mono text-sm sm:text-base">
          {command}
        </code>
        <span className="text-zinc-500 group-hover:text-zinc-300 text-xs shrink-0 transition-colors">
          {copied ? "copied" : "copy"}
        </span>
      </div>
    </button>
  );
}
