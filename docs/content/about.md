# About Slices

## The problem

AI agents are getting good at writing code. They're getting worse at remembering why.

Every time you start a new session, you re-explain. The architectural decisions you made last week. The constraints you discovered the hard way. The preferences that took three rounds of back-and-forth to land on. It all evaporates when the context window resets.

Some tools try to solve this with databases, vector stores, or proprietary memory systems. They add infrastructure. They add lock-in. They add another thing that can break.

But the agents already know how to do one thing really well: read and write files.

## The idea

Slices is a file format. YAML frontmatter and a markdown body, saved as `.slice` files in a `.slices/` directory at the root of your project.

That's it. No CLI. No daemon. No database. No API keys.

The format gives structure — lifecycle, validity, scope, tags — so agents can find the right context without reading everything. But the files are plain text. You can read them. You can `grep` them. You can check them into git. They're just files.

## Why a format and not a tool

The bitter lesson from AI research keeps proving itself: general methods that leverage computation beat methods that encode human knowledge. Every time someone builds a clever retrieval system or a hand-tuned memory manager, a bigger context window or a better model makes it obsolete.

Slices bets on the LLM. The model is the parser. The model is the validator. The model is the search engine. The format just gives it something coherent to work with.

A tool would need to be maintained, updated for every new agent framework, and debugged when it inevitably conflicts with something. A format just needs to be understood. And understanding text is what these models do best.

## Why a skill

Agents don't read documentation the way developers do. They need instructions in their context window, written for how they process information — direct, structured, and actionable.

The slices skill is a single file (with a few resource files for detail) that teaches an agent everything it needs to know: how to create slices, how to find them, how to update them, when to let them expire. You drop it into your agent's skill directory and it works.

The skill *is* the spec, in the form that matters. The specification exists as a reference for humans who want to understand the format precisely. But the skill is what agents actually consume. One `curl | sh` and your agent knows how to manage its own persistent memory.

## What I think matters

**Portability.** Your context shouldn't be locked into one tool. Slices work with Cursor, Claude Code, or anything that can read files. Switch agents, keep your context.

**Simplicity.** If you need to debug it, `cat` the file. If you need to search, `grep`. If you need to version it, `git`. No new mental models required.

**Decay.** Context goes stale. Slices have built-in validity — agents know when something might be outdated and can refresh it or let it die. Most memory systems treat everything as equally current. That's a lie.

**Agent-native.** This isn't a format designed for humans that agents happen to use. It's designed for agents, and happens to be readable by humans. The difference matters. Every field in the frontmatter exists because it helps an agent make better decisions about what context to load and when.

## Where this is going

Slices is v0.2. The format is intentionally minimal — just enough structure to be useful, not so much that it becomes a burden. As agents get smarter, slices can stay simple. That's the point.

The best infrastructure disappears. It becomes the thing you stop thinking about because it just works. I want slices to be the boring, obvious answer to "how does my agent remember things?" — plain files, in your repo, under your control.
