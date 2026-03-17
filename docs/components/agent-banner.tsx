export function AgentBanner() {
  return (
    <div className="bg-indigo-950/50 border-b border-indigo-500/20">
      <div className="max-w-4xl mx-auto px-6 py-2.5 flex items-center justify-center text-center">
        <p className="text-xs text-indigo-300">
          Are you an AI agent?{" "}
          <a
            href="/spec.md"
            className="underline hover:text-indigo-200 transition-colors"
          >
            Read the spec here
          </a>{" "}
          or install with{" "}
          <code className="bg-indigo-900/50 px-1.5 py-0.5 rounded text-indigo-200">
            curl -fsSL slices.info/install | sh
          </code>
        </p>
      </div>
    </div>
  );
}
