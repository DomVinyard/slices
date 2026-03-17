import { CopyCommand } from "@/components/copy-command";
import { Nav } from "@/components/nav";
import Link from "next/link";

export default function Home() {
  return (
    <>
      <Nav />
      <main className="max-w-4xl mx-auto px-6">
        <section className="pt-24 pb-16 text-center">
          <h1 className="text-5xl sm:text-6xl font-bold tracking-tight text-zinc-50 mb-4">
            slices
          </h1>
          <p className="text-lg sm:text-xl text-zinc-400 max-w-xl mx-auto mb-12">
            File-based context for AI agents.
            <br />A format, not a tool.
          </p>

          <CopyCommand command="curl -fsSL slices.info/install | sh" />

          <p className="text-sm text-zinc-500 mt-4">
            Installs the skill to{" "}
            <code className="text-zinc-400">~/.cursor/skills/slices/</code>
          </p>
        </section>

        <section className="py-16 border-t border-zinc-800">
          <div className="grid sm:grid-cols-3 gap-8 mb-16">
            <div>
              <h3 className="text-sm font-medium text-zinc-200 mb-2">
                A specification
              </h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                YAML frontmatter + body in a <code>.slice</code> file. Lifecycle,
                validity, scope, provenance — everything an agent needs to know
                about a piece of context.
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-zinc-200 mb-2">
                A skill
              </h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Teaches agents how to read, create, update, and discover slices
                using plain file operations. No CLI. No special tooling.
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-zinc-200 mb-2">
                Nothing else
              </h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                The bitter lesson: general methods that leverage computation beat
                methods that encode human knowledge. The LLM is the parser, the
                validator, and the search engine.
              </p>
            </div>
          </div>
        </section>

        <section className="py-16 border-t border-zinc-800">
          <h2 className="text-sm font-medium text-zinc-200 mb-6">
            What a slice looks like
          </h2>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 font-mono text-sm leading-relaxed overflow-x-auto">
            <pre className="text-zinc-300">
              <span className="text-zinc-500">---</span>
              {"\n"}
              <span className="text-indigo-400">v</span>
              <span className="text-zinc-500">: </span>
              <span className="text-emerald-400">{'"0.2"'}</span>
              {"\n"}
              <span className="text-indigo-400">id</span>
              <span className="text-zinc-500">: </span>
              <span className="text-zinc-300">01JARCH00000000000000001</span>
              {"\n"}
              <span className="text-indigo-400">title</span>
              <span className="text-zinc-500">: </span>
              <span className="text-emerald-400">Authentication Architecture</span>
              {"\n"}
              <span className="text-indigo-400">summary</span>
              <span className="text-zinc-500">: </span>
              <span className="text-emerald-400">
                JWT-based stateless auth with refresh token rotation
              </span>
              {"\n"}
              <span className="text-indigo-400">tags</span>
              <span className="text-zinc-500">: </span>
              <span className="text-zinc-300">[architecture, security]</span>
              {"\n"}
              <span className="text-indigo-400">topics</span>
              <span className="text-zinc-500">: </span>
              <span className="text-zinc-300">[JWT, OAuth2, refresh-tokens, RS256]</span>
              {"\n"}
              <span className="text-indigo-400">lifecycle</span>
              <span className="text-zinc-500">: </span>
              <span className="text-amber-400">perpetual</span>
              {"\n"}
              <span className="text-indigo-400">created_at</span>
              <span className="text-zinc-500">: </span>
              <span className="text-emerald-400">{'"2026-01-15T10:00:00Z"'}</span>
              {"\n"}
              <span className="text-indigo-400">updated_at</span>
              <span className="text-zinc-500">: </span>
              <span className="text-emerald-400">{'"2026-03-10T14:30:00Z"'}</span>
              {"\n"}
              <span className="text-indigo-400">validity</span>
              <span className="text-zinc-500">:</span>
              {"\n"}
              <span className="text-indigo-400">{"  status"}</span>
              <span className="text-zinc-500">: </span>
              <span className="text-amber-400">fresh</span>
              {"\n"}
              <span className="text-indigo-400">{"  stale_after"}</span>
              <span className="text-zinc-500">: </span>
              <span className="text-zinc-300">90d</span>
              {"\n"}
              <span className="text-indigo-400">scope</span>
              <span className="text-zinc-500">: </span>
              <span className="text-amber-400">project</span>
              {"\n"}
              <span className="text-indigo-400">kind</span>
              <span className="text-zinc-500">: </span>
              <span className="text-amber-400">context</span>
              {"\n"}
              <span className="text-indigo-400">body</span>
              <span className="text-zinc-500">:</span>
              {"\n"}
              <span className="text-indigo-400">{"  type"}</span>
              <span className="text-zinc-500">: </span>
              <span className="text-amber-400">markdown</span>
              {"\n"}
              <span className="text-indigo-400">write</span>
              <span className="text-zinc-500">: </span>
              <span className="text-amber-400">replace</span>
              {"\n"}
              <span className="text-zinc-500">---</span>
              {"\n\n"}
              <span className="text-zinc-400">
                {"# Authentication Architecture\n\nThe system uses JWT tokens..."}
              </span>
            </pre>
          </div>
        </section>

        <section className="py-16 border-t border-zinc-800">
          <div className="flex items-center justify-center gap-6 text-sm">
            <Link
              href="/spec"
              className="text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              Read the specification
            </Link>
            <span className="text-zinc-700">|</span>
            <a
              href="https://github.com/nicholasdomin/slices"
              className="text-zinc-400 hover:text-zinc-300 transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub
            </a>
          </div>
          <p className="text-center text-xs text-zinc-600 mt-8">v0.2</p>
        </section>
      </main>
    </>
  );
}
