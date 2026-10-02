import { useEffect, useMemo, useRef } from "react";
import { useLocation, useMatch, useNavigate } from "react-router";

import { DEFAULT_CHAT_MODEL_ID } from "@openforge/shared";
import { parse, z } from "zod";

import { UserMessage } from "../components/messages";
import { SessionShell } from "../components/session-shell";
import { apiClient } from "../lib/api-client";
import { getErrorMessage } from "../lib/http-errors";
import { useToast } from "../providers/toast";

const newSessionStateSchema = z.object({
  message: z.string(),
});

export function NewSession() {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  // use to cancel any double request, going to happen through useEffect
  const hasStartedRef = useRef(false);

  // const state = location.state as { message?: string } | null;
  const state = useMemo(() => {
    const parsed = newSessionStateSchema.safeParse(location.state);
    return parsed.success ? parsed.data : null;
  }, [location.state]);

  // Guard: if navigated here directly without state, go home
  useEffect(() => {
    if (!state?.message) {
      navigate("/", { replace: true });
    }
  }, [state, navigate]);

  // Create the session on mount - this screen exists to do this
  // Like an optimistic loading, rather than stucking the user on the main home screen
  // we will rather make them feel that request is already passed and redirect them to the session screen
  useEffect(() => {
    // if already started the session state then return (prevents double req fire)
    if (!state || hasStartedRef.current) {
      return;
    }

    hasStartedRef.current = true;

    let ignore = false;
    const createSession = async () => {
      try {
        // we can use apiclient to traverse through our type safe api (means getting suggestions and fire a method we need like post here)
        const res = await apiClient.sessions.$post({
          json: {
            title: state.message.slice(0, 100), // title will be the first 100 message send by the user
            cwd: process.cwd(),
            initialMessage: {
              role: "USER",
              content: state.message,
              mode: "BUILD",
              model: DEFAULT_CHAT_MODEL_ID,
            },
          },
        });

        if (ignore) return;
        if (!res.ok) {
          throw new Error(await getErrorMessage(res));
        }
        const session = await res.json();
        navigate(`/sessions/${session.id}`, {
          replace: true,
          state: { session },
        });
      } catch (error) {
        if (ignore) return;
        toast.show({
          variant: "error",
          message:
            error instanceof Error ? error.message : "Failed to create session",
        });
        // navigate user back to the home page if failed
        navigate("/", { replace: true });
      }
    };

    createSession();
    // need to cancelling request during unmount
    // even if we get an error (early return it) whether in try or catch
    // otherwise you will get an invalid react usage (an anti-pattern)
    return () => {
      ignore = true;
    };
  }, []);

  if (!state) return null;

  return (
    <SessionShell onSubmit={() => {}} inputDisabled loading>
      <UserMessage message={state.message} />
    </SessionShell>
  );
}
