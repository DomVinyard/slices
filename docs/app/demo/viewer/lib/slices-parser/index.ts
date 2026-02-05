/**
 * @slices/parser - Canonical parser and types for Slices (.tt) files.
 *
 * This is the single source of truth for:
 * - Type definitions (TTFrontmatter, ParsedFile, TTFile, etc.)
 * - File parsing (parseFile, parseFileStrict, parseFileWithRanges)
 * - JSONL parsing (parseJSONLBody)
 * - Serialization (serializeFile)
 *
 * All other packages (sdk/*, core/*, reference/*) should import from
 * this package instead of implementing their own parsers.
 */

// Re-export all types
export type {
  RelationshipType,
  WriteMode,
  OverflowMode,
  BodyType,
  KindType,
  ConversationFormat,
  TTLink,
  TTContract,
  TTBodyCode,
  TTBodyConversation,
  TTBody,
  TTPayload,
  TTDerivedFrom,
  TTMeta,
  TTFrontmatter,
  StrictTTFrontmatter,
  ParsedFile,
  ParsedFileWithRanges,
  TTFile,
  TTFilePreview,
  TTSearchResult,
  JSONLRow,
  ULIDReference,
  PathReference,
  Position,
} from "./types";

// Re-export constants
export {
  RELATIONSHIP_TYPES,
  RELATIONSHIP_PROPERTIES,
  getInverseRelationship,
  WRITE_MODES,
  OVERFLOW_MODES,
  BODY_TYPES,
  KIND_TYPES,
  CODE_LANGUAGES,
  CONVERSATION_FORMATS,
  CONVERSATION_ROLES,
  OTEL_TRACE_ID_PATTERN,
  OTEL_SPAN_ID_PATTERN,
  ULID_PATTERN,
  ULID_REFERENCE_PATTERN,
  PATH_REFERENCE_PATTERN,
} from "./constants";

export type { RelationshipProperties } from "./constants";

// Re-export parser functions
export {
  parseFile,
  parseFileWithRanges,
  parseFileStrict,
  serializeFile,
  parseJSONLBody,
} from "./parser";

// Re-export utility functions
export {
  getFileId,
  getFileTitle,
  isValidULID,
  extractLinks,
  isLinkTargetId,
  findULIDReferences,
  findPathReferences,
  getFieldPosition,
  extractIdFromPath,
} from "./utils";

// Re-export inference functions and types
export {
  computeTransitiveClosure,
  expandSymmetric,
  isTransitive,
  isSymmetric,
  getTransitiveRelationships,
  getSymmetricRelationships,
  computeAllInferences,
} from "./inference";

export type {
  GraphEdge,
  InferredEdge,
  InferenceOptions,
  TransitiveClosureResult,
} from "./inference";
