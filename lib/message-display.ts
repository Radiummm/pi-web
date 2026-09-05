import type { AgentMessage, AssistantContentBlock, AssistantMessage, ThinkingContent, ToolCallContent } from "./types";

interface DisplayOptions {
  isStreaming?: boolean;
  translate?: (key: string, params?: Record<string, string | number>) => string;
}

type GenericFailureKind = "cancelled" | "terminated" | "network" | "interrupted" | "timeout";

const DEFAULT_FAILURE_MESSAGES: Record<GenericFailureKind | "unknown" | "partial" | "detail", string> = {
  cancelled: "The model request was cancelled before completion ({source}).",
  terminated: "The upstream model terminated the response stream before completion ({source}).",
  network: "The connection to the model service failed ({source}). Check the network or proxy connection.",
  interrupted: "The model response stream ended unexpectedly before completion ({source}).",
  timeout: "The model service did not finish the response before the request timed out ({source}).",
  unknown: "The model request failed without a detailed provider error ({source}).",
  partial: "The partial response received before the interruption was preserved.",
  detail: "Technical detail: {detail}",
};

const FAILURE_KEYS: Record<GenericFailureKind | "unknown" | "partial" | "detail", string> = {
  cancelled: "chat.errorRequestCancelled",
  terminated: "chat.errorResponseTerminated",
  network: "chat.errorNetworkFailure",
  interrupted: "chat.errorResponseInterrupted",
  timeout: "chat.errorRequestTimeout",
  unknown: "chat.errorUnknownProvider",
  partial: "chat.errorPartialPreserved",
  detail: "chat.errorTechnicalDetail",
};

function formatFailurePart(
  kind: GenericFailureKind | "unknown" | "partial" | "detail",
  params: Record<string, string>,
  translate?: DisplayOptions["translate"],
): string {
  if (translate) return translate(FAILURE_KEYS[kind], params);
  return Object.entries(params).reduce(
    (text, [key, value]) => text.replaceAll(`{${key}}`, value),
    DEFAULT_FAILURE_MESSAGES[kind],
  );
}

export function getThinkingPreview(thinking: string): string {
  return thinking.trimStart().match(/^[^\r\n]{0,240}/u)?.[0].trimEnd() ?? "";
}

export function isMessageGroupAnchor(message: { role?: AgentMessage["role"]; customType?: string }): boolean {
  return message.role === "user"
    || (message.role === "custom" && message.customType === "compaction");
}

export function isEmptyThinkingBlock(block: AssistantContentBlock, options: DisplayOptions = {}): block is ThinkingContent {
  return block.type === "thinking" && !block.deferred && !options.isStreaming && block.thinking.trim() === "";
}

export function getDisplayableAssistantBlocks(
  message: AssistantMessage,
  options: DisplayOptions = {},
): AssistantContentBlock[] {
  return (message.content ?? []).filter((block) => !isEmptyThinkingBlock(block, options));
}

export function getAssistantErrorMessage(
  message: AssistantMessage,
  options: DisplayOptions = {},
): string | null {
  if (options.isStreaming || message.stopReason !== "error") return null;
  const raw = message.errorMessage?.trim();
  const source = [message.provider, message.model].filter(Boolean).join("/") || "unknown provider";
  const normalized = raw?.toLowerCase() ?? "";
  let kind: GenericFailureKind | "unknown" | undefined;

  if (!raw) kind = "unknown";
  else if (/^(this operation|request|operation) was aborted$|^request aborted$/.test(normalized)) kind = "cancelled";
  else if (/^terminated$|terminated unexpectedly/.test(normalized)) kind = "terminated";
  else if (/fetch failed|network error|websocket error|connection error/.test(normalized)) kind = "network";
  else if (/unexpected eof|connection closed|error decoding response body|response body.*closed/.test(normalized)) {
    kind = "interrupted";
  } else if (/timed?\s*out|timeout|504 status code/.test(normalized)) kind = "timeout";

  if (!kind) return raw ?? formatFailurePart("unknown", { source }, options.translate);

  const parts = [formatFailurePart(kind, { source }, options.translate)];
  const hasPartialResponse = message.content.some((block) => block.type === "text" && block.text.trim().length > 0);
  if (hasPartialResponse) parts.push(formatFailurePart("partial", {}, options.translate));
  if (raw) parts.push(formatFailurePart("detail", { detail: raw }, options.translate));
  return parts.join("\n");
}

function isFinalAnswerBlock(block: AssistantContentBlock): boolean {
  return block.type === "text" || block.type === "image";
}

export function splitFinalAssistantBlocks(
  message: AssistantMessage,
  options: DisplayOptions = {},
): { answerBlocks: AssistantContentBlock[]; processBlocks: AssistantContentBlock[] } {
  const blocks = getDisplayableAssistantBlocks(message, options);
  const lastProcessIndex = blocks.findLastIndex((block) => !isFinalAnswerBlock(block));
  if (lastProcessIndex === -1) {
    return { answerBlocks: blocks, processBlocks: [] };
  }
  return {
    answerBlocks: blocks.slice(lastProcessIndex + 1),
    processBlocks: blocks.slice(0, lastProcessIndex + 1),
  };
}

export function countToolCallBlocks(blocks: AssistantContentBlock[]): number {
  return blocks.filter((block): block is ToolCallContent => block.type === "toolCall").length;
}
