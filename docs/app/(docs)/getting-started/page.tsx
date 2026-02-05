import { CopyCommand } from "@/components/copy-command";

export default function GettingStarted() {
  return (
    <article className="prose prose-zinc">
      <h1>Getting Started</h1>

      <p>Paste this command into your agent:</p>

      <CopyCommand 
        command="curl -fsSL slices.info | sh" 
        copyText="Teach yourself Slices: (`curl -fsSL slices.info | sh`)"
      />

      <p className="mt-6">
        This installs Slices to <code>~/slices</code> and shows you how to
        register it with your agent.
      </p>

      <h2>What happens</h2>

      <ol>
        <li>Downloads Slices to your home directory</li>
        <li>
          Prints a bootstrap command for your agent's skills directory
        </li>
        <li>Your agent can now use Slices for persistent memory</li>
      </ol>

      <p>
        <a href="/spec">Read the specification →</a>
      </p>
    </article>
  );
}
