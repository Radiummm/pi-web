import assert from "node:assert/strict";
import test from "node:test";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url, { interopDefault: true });
const { installInterruptedResponseRecovery } = await jiti.import("./interrupted-response-recovery.ts");

function makeSession(result = true) {
  const appended = [];
  const session = {
    agent: {
      state: {
        messages: [{ role: "user", content: "test" }, { role: "assistant", content: [] }],
      },
    },
    sessionManager: {
      appendCustomMessageEntry(...args) {
        appended.push(args);
      },
    },
    async _prepareRetry() {
      this.agent.state.messages.pop();
      return result;
    },
  };
  return { session, appended };
}

test("continues from received text after the SDK accepts a retry", async () => {
  const { session, appended } = makeSession();
  assert.equal(installInterruptedResponseRecovery(session), true);
  assert.equal(installInterruptedResponseRecovery(session), false);

  const result = await session._prepareRetry({
    content: [{ type: "text", text: "partial answer" }],
    errorMessage: "fetch failed",
  });

  assert.equal(result, true);
  assert.equal(session.agent.state.messages.at(-1).customType, "pi-web-auto-retry-continuation");
  assert.match(session.agent.state.messages.at(-1).content, /partial answer/);
  assert.equal(session.agent.state.messages.at(-1).display, false);
  assert.equal(appended.length, 1);
});

test("keeps the SDK safe-point retry for interrupted tool calls", async () => {
  const { session, appended } = makeSession();
  installInterruptedResponseRecovery(session);

  await session._prepareRetry({
    content: [
      { type: "text", text: "running tool" },
      { type: "toolCall" },
    ],
    errorMessage: "fetch failed",
  });

  assert.deepEqual(session.agent.state.messages, [{ role: "user", content: "test" }]);
  assert.deepEqual(appended, []);
});

test("does not add recovery context when the SDK rejects the retry", async () => {
  const { session, appended } = makeSession(false);
  installInterruptedResponseRecovery(session);

  const result = await session._prepareRetry({
    content: [{ type: "text", text: "partial answer" }],
    errorMessage: "invalid api key",
  });

  assert.equal(result, false);
  assert.deepEqual(appended, []);
});
