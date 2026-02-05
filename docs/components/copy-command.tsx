"use client";

import { useState } from "react";

interface CopyCommandProps {
  command: string;
  className?: string;
}

export function CopyCommand({ command, className = "" }: CopyCommandProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={`group relative flex items-center gap-3 bg-zinc-900 text-zinc-100 rounded-lg px-4 py-3 font-mono text-sm cursor-pointer hover:bg-zinc-800 transition-colors ${className}`}
      onClick={handleCopy}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          handleCopy();
        }
      }}
    >
      <span className="text-zinc-500 select-none">$</span>
      <code className="flex-1 overflow-x-auto">{command}</code>
      <span
        className={`text-xs transition-opacity ${
          copied
            ? "text-green-400"
            : "text-zinc-500 opacity-0 group-hover:opacity-100"
        }`}
      >
        {copied ? "Copied!" : "Click to copy"}
      </span>
    </div>
  );
}
