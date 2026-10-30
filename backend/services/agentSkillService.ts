import { createHash } from "node:crypto";
import { z } from "zod";
import type { ChatCompletionMessageParam, ChatCompletionTool } from "openai/resources/chat/completions.js";
import { MAX_DOCUMENT_CHARS, MAX_TURN_SKILL_CHARS, SkillError } from "../skills/types.js";
import type { SkillDocument, SkillRegistry, SkillSummary } from "../skills/types.js";
import { requiredSkillDocuments } from "../skills/policy.js";

export type ProviderContextSnapshot = Readonly<{
  requestId: string;
  documents: ReadonlyArray<Readonly<{
    skillId: string;
    document: string;
    version: string;
    contentHash: string;
  }>>;
}>;
export type SkillResultReference = Omit<SkillDocument, "text"> & { referencedToolCallId: string };
export interface AgentSkillSession {
  catalog: SkillSummary[];
  definitions: ChatCompletionTool[];
  load(id: string): SkillDocument;
  readDocument(id: string, document: string): SkillDocument;
  recordResult(toolCallId: string, document: SkillDocument): void;
  resultFor(document: SkillDocument, messages: readonly ChatCompletionMessageParam[]): SkillDocument | SkillResultReference;
  snapshot(requestId: string, messages: readonly ChatCompletionMessageParam[]): ProviderContextSnapshot;
  canExpose(toolName: string, snapshot: ProviderContextSnapshot): boolean;
  acceptProviderContext(snapshot: ProviderContextSnapshot): void;
  canExecute(toolName: string, sourceRequestId: string): boolean;
}

const skillId = z.string().regex(/^[a-z0-9-]+$/);
const documentPath = z.string().refine(path => path.endsWith(".md") && !path.includes("\\") && path.split("/").every(segment => segment !== "" && segment !== "." && segment !== ".."), "Expected a canonical relative Markdown document path");
const loadSchema = z.strictObject({ skillId });
const readSchema = z.strictObject({ skillId, document: documentPath });
export function parseLoaderArguments(name: string, args: unknown): { skillId: string; document?: string } {
  if (name === "load_skill") return loadSchema.parse(args);
  if (name === "read_skill_document") return readSchema.parse(args);
  throw new Error("Unknown skill loader");
}

const definitions: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "load_skill",
      description: "Load an advisory skill's complete entrypoint instructions. Choose advisory skills from the catalog for specialist guidance (e.g. gym, ielts).",
      parameters: z.toJSONSchema(loadSchema),
    },
  },
  {
    type: "function",
    function: {
      name: "read_skill_document",
      description: "Read a reference Markdown document declared by a skill. Read references required by its entrypoint before advising.",
      parameters: z.toJSONSchema(readSchema),
    },
  },
];
const identity = (d: SkillDocument) => JSON.stringify([d.skillId, d.document, d.version]);
const sameDocument = (left: SkillDocument, right: SkillDocument) => left.skillId === right.skillId && left.document === right.document && left.version === right.version && left.uri === right.uri && left.text === right.text;
const hash = (text: string) => createHash("sha256").update(text, "utf8").digest("hex");

export function createAgentSkillSession(registry: SkillRegistry): AgentSkillSession {
  const records = new Map<string, SkillDocument>();
  const loaded = new Map<string, SkillDocument>();
  const issued = new Map<string, ProviderContextSnapshot>();
  const confirmed = new Map<string, ProviderContextSnapshot>();
  let latestRequestId: string | undefined;
  let loadedChars = 0;

  function read(id: string, document?: string): SkillDocument {
    const doc = registry.read(id, document);
    if (doc.text.length > MAX_DOCUMENT_CHARS) throw new SkillError("SKILL_CONTENT_TOO_LARGE", `Document exceeds ${MAX_DOCUMENT_CHARS} characters.`);
    const key = identity(doc);
    if (!loaded.has(key)) {
      if (loadedChars + doc.text.length > MAX_TURN_SKILL_CHARS) throw new SkillError("SKILL_CONTENT_TOO_LARGE", `Turn skill content exceeds ${MAX_TURN_SKILL_CHARS} characters.`);
      loaded.set(key, Object.freeze({ ...doc }));
      loadedChars += doc.text.length;
    }
    return loaded.get(key)!;
  }

  // Both sides of a recorded loader pair must exist exactly once in this payload.
  function presentRecords(messages: readonly ChatCompletionMessageParam[]): Array<[string, SkillDocument]> {
    const matches: Array<[string, SkillDocument]> = [];
    for (const [id, doc] of records) {
      const calls = messages.flatMap((m, index) => m.role === "assistant" ? (m.tool_calls ?? []).filter(c => c.id === id).map(call => ({ call, index })) : []);
      const results = messages.flatMap((m, index) => m.role === "tool" && m.tool_call_id === id ? [{ message: m, index }] : []);
      if (calls.length !== 1 || results.length !== 1 || calls[0].index >= results[0].index) continue;
      const call = calls[0].call;
      if (call.type !== "function") continue;
      try {
        const args = parseLoaderArguments(call.function.name, JSON.parse(call.function.arguments));
        const requested = registry.read(args.skillId, args.document);
        if (!sameDocument(doc, requested)) continue;
        const content = results[0].message.content;
        if (typeof content !== "string") continue;
        const parsed = JSON.parse(content);
        if (!parsed || typeof parsed !== "object" || parsed.isError || parsed.executed === false || !sameDocument(parsed, doc)) continue;
        if (!sameDocument(registry.read(doc.skillId, doc.document), doc)) continue;
        matches.push([id, doc]);
      } catch {
        // Invalid or stale evidence cannot open business tools.
      }
    }
    return matches;
  }

  function permits(toolName: string, snapshot: ProviderContextSnapshot): boolean {
    const required = requiredSkillDocuments(toolName);
    return required !== undefined && required.every(requirement => snapshot.documents.some(d => d.skillId === requirement.skillId && d.document === requirement.document));
  }

  return {
    catalog: registry.list().map(summary => ({ ...summary })),
    definitions: structuredClone(definitions),
    load: id => read(id),
    readDocument: (id, document) => read(id, document),
    recordResult(id, doc) {
      if (!id || records.has(id)) throw new Error("Duplicate or empty loader result ID");
      const known = loaded.get(identity(doc));
      if (!known || !sameDocument(known, doc) || !sameDocument(registry.read(doc.skillId, doc.document), doc)) throw new Error("Loader result is not a document loaded by this session");
      records.set(id, Object.freeze({ ...doc }));
    },
    resultFor(doc, messages) {
      const found = presentRecords(messages).find(([, recorded]) => sameDocument(recorded, doc));
      if (!found) return doc;
      const { text: _text, ...metadata } = doc;
      return { ...metadata, referencedToolCallId: found[0] };
    },
    snapshot(requestId, messages) {
      if (!requestId || issued.has(requestId)) throw new Error("Duplicate or empty provider request ID");
      const unique = new Map(presentRecords(messages).map(([, doc]) => [identity(doc), doc]));
      const documents = Object.freeze([...unique.values()].map(doc => Object.freeze({ skillId: doc.skillId, document: doc.document, version: doc.version, contentHash: hash(doc.text) })));
      const snapshot = Object.freeze({ requestId, documents });
      issued.set(requestId, snapshot);
      latestRequestId = requestId;
      return snapshot;
    },
    canExpose(toolName, snapshot) {
      return issued.get(snapshot.requestId) === snapshot && permits(toolName, snapshot);
    },
    acceptProviderContext(snapshot) {
      if (issued.get(snapshot.requestId) !== snapshot || latestRequestId !== snapshot.requestId || confirmed.has(snapshot.requestId)) throw new Error("Unissued, stale or already accepted provider context");
      confirmed.set(snapshot.requestId, snapshot);
    },
    canExecute(toolName, sourceRequestId) {
      const snapshot = confirmed.get(sourceRequestId);
      return snapshot !== undefined && permits(toolName, snapshot);
    },
  };
}
