import { randomUUID } from "node:crypto";

export type AssistantToolCall = {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
};

export type RawAgentMessage = {
  role: "assistant";
  content?: string | null;
  tool_calls?: AssistantToolCall[] | null;
  reasoning_content?: string | null;
  [key: string]: unknown;
};

const DSML_INVOKE_REGEX =
  /<[\s\t]*[|｜\s\t]*DSML[|｜\s\t]*invoke[\s\t]+name=["']([^"']+)["'][\s\t]*>([\s\S]*?)(?:<[\s\t]*\/[\s\t]*[|｜\s\t]*DSML[|｜\s\t]*invoke[\s\t]*>|(?=<[\s\t]*[|｜\s\t]*DSML[|｜\s\t]*invoke)|(?=<[\s\t]*\/[\s\t]*[|｜\s\t]*DSML[|｜\s\t]*(?:calls|tool_calls))|$)/gi;

const DSML_PARAM_REGEX =
  /<[\s\t]*[|｜\s\t]*DSML[|｜\s\t]*parameter[\s\t]+([^>]+)>([\s\S]*?)(?:<[\s\t]*\/[\s\t]*[|｜\s\t]*DSML[|｜\s\t]*parameter[\s\t]*>|(?=<[\s\t]*[|｜\s\t]*DSML[|｜\s\t]*parameter)|(?=<[\s\t]*\/[\s\t]*[|｜\s\t]*DSML[|｜\s\t]*invoke)|$)/gi;

const DSML_BLOCK_REGEX =
  /<[\s\t]*[|｜\s\t]*DSML[|｜\s\t]*(?:calls|tool_calls)[\s\t]*>[\s\S]*?(?:<[\s\t]*\/[\s\t]*[|｜\s\t]*DSML[|｜\s\t]*(?:calls|tool_calls)[\s\t]*>|$)/gi;
function normalizeParamName(name: string): string {
  if (name === "fallback_text") return "fallbackText";
  if (name === "display_data") return "displayData";
  return name.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
}

function parseAttributes(attrStr: string): {
  name: string | null;
  isString: boolean;
} {
  const nameMatch = /name=["']([^"']+)["']/i.exec(attrStr);
  const name = nameMatch ? nameMatch[1] : null;

  const stringMatch = /string=["'](true|false)["']/i.exec(attrStr);
  const isString = stringMatch
    ? stringMatch[1].toLowerCase() !== "false"
    : true;

  return { name, isString };
}

export function healDsmlToolCalls(message: RawAgentMessage): RawAgentMessage {
  // If message already has structured tool calls, do not alter it.
  if (message.tool_calls && message.tool_calls.length > 0) {
    return message;
  }

  const rawContent = message.content;
  if (!rawContent || !/[|｜]\s*DSML/i.test(rawContent)) {
    return message;
  }

  const toolCalls: AssistantToolCall[] = [];
  DSML_INVOKE_REGEX.lastIndex = 0;

  let invokeMatch: RegExpExecArray | null;
  while ((invokeMatch = DSML_INVOKE_REGEX.exec(rawContent)) !== null) {
    const toolName = invokeMatch[1].trim();
    const invokeBody = invokeMatch[2];

    const argsObj: Record<string, unknown> = {};
    DSML_PARAM_REGEX.lastIndex = 0;

    let paramMatch: RegExpExecArray | null;
    while ((paramMatch = DSML_PARAM_REGEX.exec(invokeBody)) !== null) {
      const attrStr = paramMatch[1];
      const paramBody = paramMatch[2].trim();
      const { name, isString } = parseAttributes(attrStr);

      if (!name) continue;
      const normalizedName = normalizeParamName(name);

      if (!isString) {
        try {
          argsObj[normalizedName] = JSON.parse(paramBody);
        } catch {
          argsObj[normalizedName] = paramBody;
        }
      } else {
        argsObj[normalizedName] = paramBody;
      }
    }

    const callId = `call_dsml_${randomUUID().replace(/-/g, "").slice(0, 9)}`;
    toolCalls.push({
      id: callId,
      type: "function",
      function: {
        name: toolName,
        arguments: JSON.stringify(argsObj),
      },
    });
  }

  if (toolCalls.length === 0) {
    return message;
  }

  // Remove DSML blocks from content
  let cleanedContent: string | null = rawContent
    .replace(DSML_BLOCK_REGEX, "")
    .trim();

  // If there are lingering invoke tags not caught by block regex
  cleanedContent = cleanedContent.replace(DSML_INVOKE_REGEX, "").trim();

  // Remove any orphan DSML calls / invoke closing tags
  cleanedContent = cleanedContent
    .replace(
      /<[\s\t]*\/[\s\t]*[|｜\s\t]*DSML[|｜\s\t]*(?:calls|tool_calls|invoke|parameter)[\s\t]*>/gi,
      "",
    )
    .trim();

  if (!cleanedContent) {
    cleanedContent = null;
  }

  return {
    ...message,
    content: cleanedContent,
    tool_calls: toolCalls,
  };
}
