import { zValidator } from "@hono/zod-validator";
import { MessageStatus, Mode } from "@openforge/database";
import { db } from "@openforge/database/client";

import { streamText as aiStreamText } from "ai";
import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import type { Prisma } from "@openforge/database";
import {
  type ChatStreamEvent,
  type MessagePart,
  toolCallArgsSchema,
  messagePartsSchema
} from "@openforge/shared"
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

// going to store an In-Memory active Resume Session Id
// bc it is possible that useEffect get fired twice results in storing same resume session twice
// and keeping it in Memory we can prevent that in a very primitive level, drastically imprives the experience and reduces bug
const activeResumeSessionIds = new Set<string>();

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

// a util fn
function getResumableUserMessage(
  messages: {
    role: "USER" | "ASSISTANT" | "ERROR";
    model: string;
    mode: Mode;
  }[]
) {
  const lastMessage = messages[messages.length - 1];
  if (!lastMessage || lastMessage.role !== "USER") {
    return null;
  }

  return lastMessage;
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
  // array of tool-call , reasoning or text
  const parts: MessagePart[] = []
  const resolvedModel = resolveChatModel(model);


  // capture the message that is interrupted & going to calculate how long it took to generate whatever it generated and store it in db
  // even though it was interrupted
  const persistInterruptedMessage = async () => {
    const fullText = parts  
      .filter((p) => p.type === "text")
      .map((p) => p.text)
      .join("")

    if (fullText.length === 0 && parts.length === 0) {
      return
    }

    const elapsedMs = Date.now() - startTime;
    // using InputJsonValue this because of the schama of messages we have Json which is dynamic in nature 
    // so can vary its structure alot
    const validatedParts: Prisma.InputJsonValue | undefined = 
      parts.length > 0 ? messagePartsSchema.parse(parts) : undefined

    await db.message.create({
      data: {
        sessionId,
        role: "ASSISTANT",
        status: MessageStatus.INTERRUPTED,
        model,
        content: fullText,
        parts: validatedParts,
        mode,
        duration: Math.round(elapsedMs / 1000),
      },
    });
  };

  try {
    const result = aiStreamText({
      model: resolvedModel.model,
      messages: history,
      abortSignal: abortController.signal,
      providerOptions: resolvedModel.providerOptions
    });

    for await (const part of result.fullStream) {
      if (stream.aborted) break;

      // llm is thinking
      if (part.type === "reasoning-delta") {
        const last = parts[parts.length -1]
        // if the last part is still reasoning then append the text
        if (last && last.type === "reasoning") {
          last.text += part.text
        } else {
          // otherwise push or stream back something new
          parts.push({ type: "reasoning", text: part.text })
        }
        const event: ChatStreamEvent = {type: "reasoning-delta", text: part.text }
        await stream.writeSSE({
          event: "reasoning-delta",
          data: JSON.stringify(event)
        })
      }

      if (part.type === "text-delta") {
        const last = parts[parts.length -1]
        // if it is currently rendering text we are not going to create any new section rather keep appending the existing text
        if (last && last.type === "text") {
          last.text += part.text  
        } else {
          parts.push({ type: "text", text: part.text})
        }

        const event: ChatStreamEvent = { type: "text-delta", text: part.text}
        await stream.writeSSE({
          event: "text-delta",
          data: JSON.stringify(event)
        })
      }

      if (part.type === "tool-call") {
        const args = toolCallArgsSchema.parse(part.input)

        parts.push({
          type: "tool-call",
          id: part.toolCallId,
          name: part.toolName,
          args
        })

        const event: ChatStreamEvent = {
          type: "tool-call",
          toolCallId: part.toolCallId,
          toolName: part.toolName,
          args
        }
        await stream.writeSSE({ event: "tool-call", data: JSON.stringify(event)})
      }

      // started calling a tool then here we handle the finish callig a tool
      if (part.type === "tool-result") {
        const resultStr = typeof part.output === "string" ? part.output : JSON.stringify(part.output)

        const tcPart = parts.find(
          // ugly tsc for strict type (otherwise very simple fn)
          (p): p is Extract<MessagePart, {type: "tool-call"}> => 
            p.type === "tool-call" && p.id === part.toolCallId
        );

        if (tcPart) {
          tcPart.result = resultStr
        }

        const event: ChatStreamEvent = {
          type: "tool-result",
          toolCallId: part.toolCallId,
          result: resultStr
        }
      }
      
      if (part.type === "error") {
        throw part.error;
      }
    }

    if (stream.aborted || abortController.signal.aborted) {
      await persistInterruptedMessage();
      return;
    }

    const elapsedMs = Date.now() - startTime;

    // fullText querying over all the parts and only filtering those who are actual text
    const fullText = parts
      .filter((p)=> p.type === "text")
      .map((p) => p.text)
      .join("")

      const validatedParts: Prisma.InputJsonValue | undefined = 
        parts.length > 0 ? messagePartsSchema.parse(parts) : undefined

    const assistantMessage = await db.message.create({
      data: {
        sessionId,
        role: "ASSISTANT",
        status: MessageStatus.COMPLETE,
        model,
        content: fullText,
        parts: validatedParts,
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
      await persistInterruptedMessage();
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

    const resumableMessage = getResumableUserMessage(session.messages);
    if (!resumableMessage) {
      return c.json(
        { error: "Session has no pending user message to resume" },
        409
      );
    }

    // perhaps the model is from last year & we deprecated it
    if (!isSupportedChatModel(resumableMessage.model)) {
      return c.json(
        {
          error: `Session uses unsupported model: ${resumableMessage.model}`,
        },
        409
      );
    }

    // useEffect fires activeResume, so we need to check can happen twice also
    if (activeResumeSessionIds.has(sessionId)) {
      return c.json({ error: "Session already has an active resume" }, 409);
    }

    // no resume was in progress, so can succesfully add them in resume
    activeResumeSessionIds.add(sessionId);

    const history = buildConversationHistory(session.messages);
    const abortController = new AbortController();

    // 3 argument of streamSSE(context, response, error)
    try {
      return streamSSE(
        c,
        async (stream) => {
          stream.onAbort(() => {
            abortController.abort();
          });

          try {
            await streamAIResponse(stream, {
              sessionId,
              model: resumableMessage.model,
              history,
              mode: resumableMessage.mode,
              abortController,
            });
          } finally {
            // resume ended, delete that from our in-memory app
            activeResumeSessionIds.delete(sessionId);
          }
        },
        // handling the error because something can go wrong(sending back the errorEvent to the terminal if something happens)
        // the error happens here will not be persisted on the db (bc they are basically temporary errors)
        // because these error are the error except/out of the streamAIResponse
        // bc streamAIResponse contain contains its own try-catch block and throw there
        async (err, stream) => {
          activeResumeSessionIds.delete(sessionId);
          const message = err instanceof Error ? err.message : String(err);
          const errorEvent: ChatStreamEvent = { type: "error", message };
          await stream.writeSSE({
            event: "error",
            data: JSON.stringify(errorEvent),
          });
        }
      );
    } catch (error) {
      // if error occured our in-memory should know that this message is ended or deleted
      activeResumeSessionIds.delete(sessionId);
      throw error;
    }
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
