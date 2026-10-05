import { useCallback, useEffect, useRef, useState } from "react";

import type { Mode } from "@openforge/database/enums";
import {
  chatStreamEventSchema,
  type SupportedChatModelId,
} from "@openforge/shared";
import { EventSourceParserStream } from "eventsource-parser/stream";
import type { ClientResponse } from "hono/client";
import { requestId } from "hono/request-id";
import prettyMs from "pretty-ms";

import { apiClient } from "../lib/api-client";
import { getErrorMessage } from "../lib/http-errors";

export type ClientMessagePart = {
  type: "text";
  text: string;
};

export type Message =
  | {
      id: string;
      role: "user";
      content: string;
      mode: Mode;
      model: SupportedChatModelId;
    }
  | {
      id: string;
      role: "assistant";
      content: string;
      mode: Mode;
      model: SupportedChatModelId;
      parts: ClientMessagePart[];
      duration?: string;
    }
  | {
      id: string;
      role: "error";
      content: string;
    };

type StreamingState =
  | {
      status: "idle";
    }
  | {
      status: "streaming";
      parts: ClientMessagePart[];
      mode: Mode;
      model: SupportedChatModelId;
    };

type ActiveStream = {
  requestId: string;
  controller: AbortController;
  mode: Mode;
  model: SupportedChatModelId;
  parts: ClientMessagePart[];
};

type SubmitParams = {
  userText: string;
  mode: Mode;
  model: SupportedChatModelId;
};

type RunStreamParams = {
  mode: Mode;
  model: SupportedChatModelId;
  request: (controller: AbortController) => Promise<ClientResponse<unknown>>;
};

export function useChat(sessionId: string, initialMessages: Message[]) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  // the streaming is a discriminative union means if status is idle than ok
  // if not then we need to track of mode, model, parts and all
  const [streaming, setStreaming] = useState<StreamingState>({
    status: "idle",
  });
  const activeStreamRef = useRef<ActiveStream | null>(null);

  const updateMessages = useCallback(
    (updater: (prev: Message[]) => Message[]) => {
      setMessages((prev) => updater(prev));
    },
    []
  );

  const isActiveRequest = useCallback((requestId: string) => {
    return activeStreamRef.current?.requestId === requestId;
  }, []);

  const emitParts = useCallback(
    (requestId: string, parts: ClientMessagePart[]) => {
      if (!isActiveRequest(requestId)) return;

      const snapshot = [...parts];
      const activeStream = activeStreamRef.current;
      if (!activeStream) {
        return;
      }

      activeStream.parts = snapshot;
      setStreaming({
        status: "streaming",
        parts: snapshot,
        mode: activeStream.mode,
        model: activeStream.model,
      });
    },
    [isActiveRequest]
  );

  const clearStream = useCallback(
    (requestId: string) => {
      if (!isActiveRequest(requestId)) return;

      activeStreamRef.current = null;
      setStreaming({ status: "idle" });
    },
    [isActiveRequest]
  );

  const handleStream = useCallback(
    async (response: ClientResponse<unknown>, activeStream: ActiveStream) => {
      if (!isActiveRequest(activeStream.requestId)) return;

      if (!response.ok) {
        const message = await getErrorMessage(response);
        updateMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "error",
            content: message,
          },
        ]);
        return;
      }

      const parts: ClientMessagePart[] = [];

      // we always expect the body
      const stream = response
        .body!.pipeThrough(new TextDecoderStream())
        .pipeThrough(new EventSourceParserStream());

      for await (const { data } of stream) {
        if (!isActiveRequest(activeStream.requestId)) return;

        let event;

        try {
          event = chatStreamEventSchema.parse(JSON.parse(data));
        } catch (err) {
          const message =
            err instanceof Error ? err.message : "Invalid stream event";
          // do an optimistic update of all the messages
          updateMessages((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              role: "error",
              content: message,
            },
          ]);
          break;
        }

        switch (event.type) {
          case "text-delta": {
            const last = parts[parts.length - 1];
            if (last && last.type === "text") {
              last.text += event.text;
            } else {
              parts.push({ type: "text", text: event.text });
            }
            emitParts(activeStream.requestId, parts);
            break;
          }
          case "done": {
            if (!isActiveRequest(activeStream.requestId)) return;

            const fullText = parts
              .filter((p) => p.type === "text")
              .map((p) => p.text)
              .join("");

            // now we preserve the previous messages and updateMessage coming from the assistant
            updateMessages((prev) => [
              ...prev,
              {
                id: event.messageId,
                role: "assistant",
                content: fullText,
                mode: activeStream.mode,
                model: activeStream.model,
                duration: prettyMs(event.durationMs),
                parts: [...parts], // shallow copy of parts so that we don't mutate it
              },
            ]);
            break;
          }
          case "error":
            updateMessages((prev) => [
              ...prev,
              {
                id: crypto.randomUUID(),
                role: "error",
                content: event.message,
              },
            ]);
            break;
        }
      }
    },
    [updateMessages, emitParts, isActiveRequest]
  );

  const runStream = useCallback(
    async ({ mode, model, request }: RunStreamParams) => {
      const controller = new AbortController();
      const activeStream: ActiveStream = {
        requestId: crypto.randomUUID(),
        controller,
        mode,
        model,
        parts: [],
      };

      activeStreamRef.current = activeStream;
      setStreaming({
        status: "streaming",
        parts: [],
        mode,
        model,
      });

      try {
        const response = await request(controller);
        // after getting the response, we will pass it to handleStream function
        await handleStream(response, activeStream);
      } catch (err) {
        // early return for AbortError (because these are intentional error)
        if (err instanceof DOMException && err.name == "AbortError") {
          return;
        }

        if (!isActiveRequest(activeStream.requestId)) return;

        const msg = err instanceof Error ? err.message : String(err);
        updateMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "error",
            content: msg,
          },
        ]);
      } finally {
        clearStream(activeStream.requestId);
      }
    },
    [clearStream, handleStream, isActiveRequest, updateMessages]
  );

  const resume = useCallback(
    async (
      { mode, model }: Omit<SubmitParams, "userText"> // user is not going to pass any new text , just extract the userText which is kind of a submission using submitParam
    ) => {
      await runStream({
        mode,
        model,
        request: async (controller) => {
          return apiClient.chat[":sessionId"].resume.$post(
            { param: { sessionId } },
            { init: { signal: controller.signal } }
          );
        },
      });
    },
    [runStream, sessionId]
  );

  // Auto-resume when the conversation ends with a user message that has no reply
  const hasAutoResumedRef = useRef(false);
  useEffect(() => {
    if (hasAutoResumedRef.current) return;
    const last = initialMessages[initialMessages.length - 1];
    if (!last || last.role !== "user") return;

    hasAutoResumedRef.current = true;
    void resume({ mode: last.mode, model: last.model });
  }, [initialMessages, resume]);

  const submit = useCallback(
    async ({ userText, mode, model }: SubmitParams) => {
      const userMessage: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content: userText,
        mode,
        model,
      };
      // we are doing a optimistic updating of the message with that user message
      // we are not re-fetching the message just because we are submitting the new one we manually appending it
      // that's why we are manually mocking it the userId
      updateMessages((prev) => [...prev, userMessage]);

      //call to "chat/:sesssionId" , now persist to the db and start streaming back
      await runStream({
        mode,
        model,
        request: async (controller) => {
          return apiClient.chat[":sessionId"].$post(
            {
              param: { sessionId },
              json: { content: userText, mode, model },
            },
            {
              init: {
                signal: controller.signal,
              },
            }
          );
        },
      });
    },
    [runStream, sessionId, updateMessages]
  );

  const abort = useCallback(() => {
    const activeStream = activeStreamRef.current;
    if (!activeStream) return;

    activeStreamRef.current = null;
    setStreaming({ status: "idle" });
    activeStream.controller.abort();
  }, []);

  return { messages, streaming, submit, abort };
}
