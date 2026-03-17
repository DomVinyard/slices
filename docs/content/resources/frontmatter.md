# Frontmatter Reference

Complete field reference for slices v0.2 frontmatter. All fields are top-level YAML keys (no namespace prefix).

## Identity

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `v` | string | yes | Spec version. `"0.2"` |
| `id` | string | yes | Globally unique ULID. 26 chars, Crockford's Base32. |
| `title` | string | yes | Clear, descriptive name for browsing and search. |
| `summary` | string | yes | Retrieval-optimized description. Front-load key terms. |
| `tags` | string[] | no | Organizational labels for categorical filtering. |
| `topics` | string[] | no | Specific entities, concepts, and terms this slice covers. |

## Temporality

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `lifecycle` | enum | yes | `perpetual`, `snapshot`, or `ephemeral`. |
| `created_at` | ISO 8601 | yes | When this slice was created. |
| `updated_at` | ISO 8601 | yes | When this slice was last modified. |

## Validity

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `validity.status` | enum | no | `fresh`, `stale`, `expired`, or `unknown`. |
| `validity.expires_at` | ISO 8601 | no | Hard expiry timestamp. `null` = never. |
| `validity.stale_after` | duration | no | Duration after `updated_at` before stale. e.g., `90d`, `2w`, `6m`. |
| `validity.depends_on` | array | no | Source slices that invalidate this one if changed. |
| `validity.depends_on[].id` | string | — | Source slice ID. |
| `validity.depends_on[].hash` | string | — | Content hash at validation time. `sha256:...` |
| `validity.triggers` | string[] | no | Named events that invalidate this slice. e.g., `deploy`, `schema-change`. |
| `validity.checked_at` | ISO 8601 | no | When an agent last verified validity. |

### Duration format

Number + unit: `24h`, `90d`, `2w`, `6m`, `1y`.

## Scope

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `scope` | enum | no | `personal`, `project`, or `team`. Default: `project`. |
| `owner` | string | no | Who maintains this slice. |
| `audience` | enum | no | `agent`, `human`, or `both`. Default: `both`. |

## Content

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `kind` | enum | no | `context`, `pointer`, or `index`. Default: `context`. |
| `body.type` | enum | yes | `markdown`, `jsonl`, `text`, `code`, `yaml`, or `none`. |
| `body.code.lang` | string | no | Language identifier when `body.type` is `code`. |
| `body.code.extension` | string | no | File extension when `body.type` is `code`. |

## Mutation

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `write` | enum | no | `append`, `replace`, or `immutable`. Default: `append`. |
| `overflow` | enum | no | `split`, `summarize`, `archive`, or `error`. |

## Contract

All fields are natural language instructions.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `contract.purpose` | string | no | What content belongs in this slice. |
| `contract.exclude` | string[] | no | What does NOT belong. |
| `contract.format` | string | no | How to structure content. |
| `contract.cleanup` | string | no | Maintenance rules. |

## Provenance

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `origin.source` | enum | no | `user-stated`, `inferred`, `observed`, `generated`, or `imported`. |
| `origin.agent` | string | no | Which agent or user created this. |
| `origin.confidence` | number | no | 0–1 reliability score. |
| `origin.context` | string | no | Why this slice was created. |

## Derivation

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `derived_from.id` | string | no | Source slice ID. |
| `derived_from.hash` | string | no | Source content hash at derivation time. `sha256:...` |
| `derived_from.transform` | string | no | `summarize`, `extract`, `compile`, or `aggregate`. |

## Pointer Payload

For `kind: pointer` slices.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `payload.uri` | string | no | Where the content lives. Path or URL. |
| `payload.hash` | string | no | Content integrity hash. |
| `payload.size` | number | no | Size in bytes. |

## Links

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `links[].rel` | string | yes | Relationship type (freeform). |
| `links[].to` | string | yes | Target slice ID or relative path. |
| `links[].label` | string | no | Human-readable description. |

### Recommended relationship types

| Relationship | Inverse | Description |
|-------------|---------|-------------|
| `depends_on` | `blocks` | A depends on B |
| `supersedes` | `superseded_by` | A replaces B |
| `parent` | `child` | A contains B |
| `part_of` | `has_part` | A is a component of B |
| `derived_from` | `source_of` | A was derived from B |
| `evidence_for` | `evidence_against` | A supports/contradicts B |
| `see_also` | `see_also` | Loose bidirectional association |
| `routes_to` | `routed_from` | A routes content to B |

## Extension

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `meta` | object | no | Arbitrary user-defined key-value pairs. |
