import type { AgentSessionLike } from "./pi-types";

type RetryContentBlock = {
  type: string;
  text?: string;
};

type RetryAssistantMessage = {
  content: RetryContentBlock[];
  errorMessage?: string;
};

type RetrySession = AgentSessionLike & {
  __piWebInterruptedResponseRecoveryInstalled?: boolean;
  _prepareRetry?: (message: RetryAssistantMessage) => Promise<boolean>;
  agent: AgentSessionLike["agent"] & {
    state?: NonNullable<AgentSessionLike["agent"]["state"]> & {
      messages?: Array<{ role: string; [key: string]: unknown }>;
    };
  };
};

/**
 * Pi 0.84 retries transient failures from the previous user/tool message and
 * drops any text that already reached the browser. Keep the SDK's retry
 * policy/backoff, then add a hidden continuation message after it removes the
 * failed assistant turn. Tool-call interruptions retain the SDK's safe full
 * retry because replaying an incomplete call could duplicate side effects.
 */
export function installInterruptedResponseRecovery(session: AgentSessionLike): boolean {
  const retrySession = session as RetrySession;
  const originalPrepareRetry = retrySession._prepareRetry;
  if (typeof originalPrepareRetry !== "function" || retrySession.__piWebInterruptedResponseRecoveryInstalled) {
    return false;
  }

  retrySession.__piWebInterruptedResponseRecoveryInstalled = true;
  retrySession._prepareRetry = async (message) => {
    const shouldRetry = await originalPrepareRetry.call(retrySession, message);
    if (!shouldRetry) return false;

    const partialText = message.content
      .filter((block) => block.type === "text" && typeof block.text === "string")
      .map((block) => block.text)
      .join("");
    const hasToolCall = message.content.some((block) => block.type === "toolCall");
    const messages = retrySession.agent.state?.messages;
    if (!partialText || hasToolCall || !messages) return true;

    const recoveryContent = `The previous assistant response was interrupted by a transient transport error. The text below is the exact partial response that reached the user. Continue directly from the point where it stopped, without repeating or rewriting any of it. Preserve the original task and finish the response.\n\n<partial_response>\n${partialText}\n</partial_response>`;
    const recoveryMessage = {
      role: "custom",
      customType: "pi-web-auto-retry-continuation",
      content: recoveryContent,
      display: false,
      details: { errorMessage: message.errorMessage },
      timestamp: Date.now(),
    };
    messages.push(recoveryMessage);
    retrySession.sessionManager.appendCustomMessageEntry(
      recoveryMessage.customType,
      recoveryMessage.content,
      recoveryMessage.display,
      recoveryMessage.details,
    );
    return true;
  };
  return true;
}
