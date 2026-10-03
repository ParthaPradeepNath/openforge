import { zValidator } from "@hono/zod-validator";
import { MessageStatus, Mode } from "@openforge/database";
import { db } from "@openforge/database/client";
import { type ChatStreamEvent } from "@openforge/shared";
import { streamText as aiStreamText } from "ai";
import { Hono } from "hono";
import { stream, streamSSE } from "hono/streaming";
import { z } from "zod";

import { isSupportedChatModel, resolveChatModel } from "../lib/models";

const submitSchema = z.object({
  content: z.string(),
  mode: z.enum(Mode),
  model: z.string().refine(isSupportedChatModel, "Unsupported model"),
});

const submitValidator = zValidator("json", submitSchema, (result, c) => {
  if (!result.success) {
    return c.json({ error: "Invalid request body" }, 400);
  }
});

// Strip error messages and empty assistant messages from the conversation
function buildConversationHistory(
  messages: {
    role: "USER" | "ASSISTANT" | "ERROR";
    content: string;
    status: MessageStatus;
  }[]
) {
  return messages.flatMap((m) => {
    if (m.role === "ERROR") return [];
    if (m.role === "ASSISTANT" && m.content.length === 0) return [];
    return [
      {
        role: m.role === "USER" ? ("user" as const) : ("assistant" as const),
        content: m.content,
      },
    ];
  });
}

type StreamParams = {
  sessionId: string;
  model: string;
  history: { role: "user" | "assistant"; content: string }[];
  mode: Mode;
  abortController: AbortController;
};

async function streamAIResponse(
  stream: Parameters<Parameters<typeof streamSSE>[1]>[0],
  params: StreamParams
) {
  const { sessionId, model, history, mode, abortController } = params;
  const startTime = Date.now();
  const resolvedModel = resolveChatModel(model);
  let fullText = "";

  try {
    const result = aiStreamText({
      model: resolvedModel.model,
      messages: history,
      abortSignal: abortController.signal,
    });

    for await (const part of result.fullStream) {
      if (stream.aborted) break;

      if (part.type === "text-delta") {
        fullText += part.text;
        const event: ChatStreamEvent = { type: "text-delta", text: part.text };
        await stream.writeSSE({
          event: "text-delta",
          data: JSON.stringify(event),
        });
      }
      if (part.type === "error") {
        throw part.error;
      }
    }

    if (stream.aborted || abortController.signal.aborted) {
      return;
    }

    const elapsedMs = Date.now() - startTime;

    const assistantMessage = await db.message.create({
      data: {
        sessionId,
        role: "ASSISTANT",
        status: MessageStatus.COMPLETE,
        model,
        content: fullText,
        mode,
        duration: Math.round(elapsedMs / 1000),
      },
    });

    const doneEvent: ChatStreamEvent = {
      type: "done",
      messageId: assistantMessage.id,
      durationMs: elapsedMs,
    };

    await stream.writeSSE({
      event: "done",
      data: JSON.stringify(doneEvent),
    });
  } catch (err) {
    if (abortController.signal.aborted) {
      return;
    }

    // checking the error message by seeing its instance
    const message = err instanceof Error ? err.message : String(err);

    // persisting a history of session of message in db (so the user know in which session the error has happened)
    await db.message.create({
      data: {
        sessionId,
        role: "ERROR",
        status: MessageStatus.COMPLETE, // Message no longer streaming & its a ERROR message
        model,
        content: message,
        mode,
      },
    });

    const errorEvent: ChatStreamEvent = { type: "error", message }; // create an errorEvent
    await stream.writeSSE({ event: "error", data: JSON.stringify(errorEvent) }); // stream back the error event
  }
}

const app = new Hono()
  // their will be not validator for the resume route because their will be nothing to pass on by the user
  // and this resume will be very helpful for the optimistic way we are making the ui
  .post("/:sessionId/resume", async (c) => {
    const sessionId = c.req.param("sessionId");

    const session = await db.session.findUnique({
      where: { id: sessionId },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });

    if (!session) {
      return c.json({ eror: "Session not found" }, 404);
    }

    const lastMessage = session.messages[session.messages.length - 1];
    if (!lastMessage || lastMessage.role !== "USER") {
      return c.json(
        { error: "Session has no pending user message to resume" },
        409
      );
    }

    // perhaps the model is from last year & we deprecated it
    if (!isSupportedChatModel(lastMessage.model)) {
      return c.json(
        {
          error: `Session uses unsupported model: ${lastMessage.model}`,
        },
        409
      );
    }

    const history = buildConversationHistory(session.messages);
    const abortController = new AbortController();

    // 3 argument of streamSSE(context, response, error)
    return streamSSE(
      c,
      async (stream) => {
        stream.onAbort(() => {
          abortController.abort();
        });

        await streamAIResponse(stream, {
          sessionId,
          model: lastMessage.model,
          history,
          mode: lastMessage.mode,
          abortController,
        });
      },
      // handling the error because something can go wrong(sending back the errorEvent to the terminal if something happens)
      // the error happens here will not be persisted on the db (bc they are basically temporary errors)
      // because these error are the error except/out of the streamAIResponse
      // bc streamAIResponse contain contains its own try-catch block and throw there
      async (err, stream) => {
        const message = err instanceof Error ? err.message : String(err);
        const errorEvent: ChatStreamEvent = { type: "error", message };
        await stream.writeSSE({
          event: "error",
          data: JSON.stringify(errorEvent),
        });
      }
    );
  })
  .post("/:sessionId", submitValidator, async (c) => {
    const sessionId = c.req.param("sessionId");

    const session = await db.session.findUnique({
      where: { id: sessionId },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });

    if (!session) {
      return c.json({ error: "Session not found" }, 404);
    }

    // de-contruct the data means data is a validated json
    // data is going through submit validator follows the schema strictly
    const data = c.req.valid("json");

    await db.message.create({
      data: {
        sessionId,
        role: "USER",
        status: MessageStatus.COMPLETE,
        model: data.model,
        content: data.content,
        mode: data.mode,
      },
    });

    // append a new message in the db
    const history = buildConversationHistory([
      ...session.messages, // limit to last 10, 5 messages
      {
        role: "USER" as const,
        content: data.content,
        status: MessageStatus.COMPLETE,
      },
    ]);

    const abortController = new AbortController();

    // can give us error or break in many ways, so properly communicating back to the user what happen
    return streamSSE(
      c, // passing the context in the first argument ( c = context in hono)
      async (stream) => {
        stream.onAbort(() => {
          abortController.abort();
        });

        await streamAIResponse(stream, {
          sessionId,
          model: data.model,
          history,
          mode: data.mode,
          abortController,
        });
      },
      async (err, stream) => {
        const message = err instanceof Error ? err.message : String(err);
        const errorEvent: ChatStreamEvent = { type: "error", message };
        await stream.writeSSE({
          event: "error",
          data: JSON.stringify(errorEvent),
        });
      }
    );
  });

export default app;
