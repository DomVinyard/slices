"use client";

import { useState } from "react";

interface CopyCommandProps {
  command: string;
  copyText?: string;
  className?: string;
}

export function CopyCommand({ command, copyText, className = "" }: CopyCommandProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(copyText || command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={`group relative bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200/60 rounded-2xl p-6 cursor-pointer hover:border-amber-300 hover:shadow-lg hover:shadow-amber-100/50 transition-all duration-200 ${className}`}
      onClick={handleCopy}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          handleCopy();
        }
      }}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-amber-400 select-none text-lg">$</span>
          <code className="font-mono text-zinc-700 text-base overflow-x-auto">{command}</code>
        </div>
        <span
          className={`text-sm font-medium whitespace-nowrap transition-all ${
            copied
              ? "text-green-600"
              : "text-amber-600/70 group-hover:text-amber-600"
          }`}
        >
          {copied ? "Copied!" : "Click to copy"}
        </span>
      </div>
    </div>
  );
}
