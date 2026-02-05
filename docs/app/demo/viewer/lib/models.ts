/**
 * TreeText file model types
 */

export interface TTLink {
  rel: string;
  to: string;
}

export interface TTContract {
  purpose?: string;
  write?: 'append' | 'replace' | 'supersede';
  overflow?: 'split' | 'summarize' | 'archive' | 'error';
}

export interface TTBodyCode {
  lang?: string;
  extension?: string;
  args?: string[];
}

export interface TTBodyConversation {
  participants?: string[];
  agent_id?: string;
  session_id?: string;
  parent_session?: string;
  trace_id?: string;
  span_id?: string;
  format?: 'messages' | 'transcript' | 'compacted' | string;
  includes_tool_calls?: boolean;
  includes_compaction?: boolean;
}

export interface TTRoutineStep {
  instruction?: string;
  read?: string;
  run?: string;
  args?: string[];
  note?: string;
}

export interface TTBodyRoutine {
  requirements?: string;
  steps: TTRoutineStep[];
}

export interface TTBody {
  type: 'markdown' | 'jsonl' | 'none' | 'code' | 'conversation' | 'text' | 'yaml' | 'routine' | 'csv';
  code?: TTBodyCode;
  conversation?: TTBodyConversation;
  routine?: TTBodyRoutine;
}

export interface TTActivation {
  triggers?: string[];
  overview?: string;
  limitations?: string;
  connections?: string[];
}

export interface TTResourceRef {
  run?: string;
  read?: string;
  when?: string;
}

export interface TTFrontmatter {
  v: string;
  id: string;
  title: string;
  summary?: string;
  kind?: 'context' | 'pointer';
  body?: TTBody;
  contract?: TTContract;
  links?: TTLink[];
  created_at?: string;
  updated_at?: string;
  meta?: Record<string, unknown>;
  activation?: TTActivation;
  routines?: TTResourceRef[];
  knowledge?: TTResourceRef[];
}

export interface TTFile {
  id: string;
  path: string;
  frontmatter: TTFrontmatter;
  body: string;
  raw: string;
}

export interface GraphNode {
  id: string;
  title: string;
  summary?: string;
  kind?: string;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}

export interface GraphEdge {
  source: string | GraphNode;
  target: string | GraphNode;
  rel: string;
}

export interface Graph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}
