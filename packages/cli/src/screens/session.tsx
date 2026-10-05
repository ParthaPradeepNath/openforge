import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router";

import type { InferResponseType } from "hono/client";
import { z } from "zod";
import prettyMs from "pretty-ms"
import { DEFAULT_CHAT_MODEL_ID, type SupportedChatModelId } from "@openforge/shared";
import { BotMessage, ErrorMessage, UserMessage } from "../components/messages";
import { SessionShell } from "../components/session-shell";
import { apiClient } from "../lib/api-client";
import { getErrorMessage } from "../lib/http-errors";
import { useToast } from "../providers/toast";
import { useChat, type Message } from "../hooks/use-chat";
// getting the type from the server "/session/:id", so that we will know that what will be returned
// here we are inferring the response time , choosing session ,then session id route where we are choosing the get request, withe the return code
type SessionData = InferResponseType<
  (typeof apiClient.sessions)[":id"]["$get"],
  200
>;

// defining a zod object session will be a custom zod rule were we are using the session data(type) from above
const sessionLocationSchema = z.object({
  session: z.custom<SessionData>(
    (val) => val != null && typeof val === "object" && "id" in val
  ), // make sure not null and type of the value is object have id inside
});

function mapDbMessages(dbMessages: SessionData["messages"]): Message[] {
  return dbMessages.map((m): Message => {
    if (m.role === "ERROR") {
      return { id: m.id, role: "error", content: m.content}
    }

    if (m.role === "USER") {
      return {
        id: m.id,
        role: "user",
        content: m.content,
        mode: m.mode,
        model: m.model as SupportedChatModelId
      }
    }

    return {
      id: m.id,
      role: "assistant",
      content: m.content,
      model: m.model as SupportedChatModelId,
      mode: m.mode,
      parts: [{ type: "text", text: m.content }],
      ...(m.duration != null ? { duration: prettyMs(m.duration * 1000)} : {})
    }
  })
}

// this will determine that whether we will use UserMessage, BotMessage or ErrorMessage
function ChatMessage(
  { msg }:
   { msg: Message}) {

  if (msg.role === "user") {
    return <UserMessage message={msg.content} />;
  }

  if (msg.role === "error") {
    return <UserMessage message={msg.content} />;
  }

  // The default message
  return <BotMessage 
   parts={msg.parts}
   model={msg.model}
   mode={msg.mode}
   duration={msg.duration}
   streaming={false}
  />;
}

function SessionChat ({ session}: { session: SessionData}){
  const [initialMessages] = useState(() => mapDbMessages(session.messages))
  const { messages, streaming, submit, abort} = useChat(session.id, initialMessages);

  // Stop the pending reply when the user leaves this session
  useEffect(() => {
    return () => abort()
  }, [abort])

  return (
    <SessionShell
      onSubmit={(text) => 
        submit({ userText: text, mode: "BUILD", model: DEFAULT_CHAT_MODEL_ID})
      }
      loading={streaming.status === "streaming"}
    >
      {messages.map((msg) => (
        <ChatMessage key={msg.id} msg={msg}/>
      ))}
      {streaming.status === "streaming" && streaming.parts.length > 0 && (
        <BotMessage 
          parts={streaming.parts}
          model={streaming.model }
          mode={streaming.mode}
          streaming
        />
      )}
    </SessionShell>
  )
}

export function Session() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();

  // we preftech so that we don't need to go through 2 api request (post , get(from the if from the params))
  const prefetched = useMemo(() => {
    const parsed = sessionLocationSchema.safeParse(location.state);
    return parsed.success ? parsed.data.session : null;
  }, [location.state]);

  const [session, setSession] = useState<SessionData | null>(prefetched);
  // const [session, setSession] = useState<SessionData | null>(null) -> can do this also and fetch it from useEffect , but that will make the user wait twice

  useEffect(() => {
    // Skip fetch if session was passed via location state
    if (prefetched) return;

    setSession(null);

    if (!id) return;

    // unmount (using the ignore variable)
    let ignore = false;

    const fetchSession = async () => {
      try {
        const res = await apiClient.sessions[":id"].$get({ param: { id } });
        if (ignore) return;
        if (!res.ok) throw new Error(await getErrorMessage(res));
        const resolved = await res.json();
        setSession(resolved);
      } catch (err) {
        if (ignore) return; // if the component has unmounted do an early return
        toast.show({
          variant: "error",
          message:
            err instanceof Error ? err.message : "Failed to load session",
        });

        navigate("/", { replace: true }); // if some error occured, navigate the user to home
      }
    };
    // call it
    fetchSession();
    // properly unmount it
    return () => {
      ignore = true;
    };
  }, [id, prefetched, toast, navigate]);

  if (!session) {
    return <SessionShell onSubmit={() => {}} inputDisabled loading />;
  }

  return (
    <SessionChat key={session.id} session={session}/>
  );
}
