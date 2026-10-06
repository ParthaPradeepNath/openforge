import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router";

import { TextAttributes } from "@opentui/core";
import { format } from "date-fns";
import type { InferResponseType } from "hono/client";

import { apiClient } from "../../lib/api-client";
import { getErrorMessage } from "../../lib/http-errors";
import { useDialog } from "../../providers/dialog";
import { useToast } from "../../providers/toast";
import { DialogSearchList } from "../dialog-search-list";

// can infer the type also (strict infer)
type Session = InferResponseType<
  (typeof apiClient.sessions)["$get"],
  200
>[number];

// or can manually type also
// type Session = {
//     id: string
//     title: string
//     createdAt: string
// }

export const SessionsDialogContent = () => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const { close } = useDialog();
  const navigate = useNavigate();
  const { show } = useToast();

  useEffect(() => {
    let ignore = false;

    const fetchSessions = async () => {
      try {
        const res = await apiClient.sessions.$get();
        if (!res.ok) {
          throw new Error(await getErrorMessage(res));
        }

        const data = await res.json();

        // if already un-mounted don't set any data
        if (!ignore) {
          setSessions(data);
          setLoading(false);
        }
      } catch (error) {
        if (!ignore) {
          show({
            variant: "error",
            message:
              error instanceof Error
                ? error.message
                : "Failed to fetch sessions",
          });
          close();
        }
      }
    };

    fetchSessions();

    return () => {
      ignore = true;
    };
  }, [close, show]); // need to put in the dependency array that is why we destructure it

  const handleSelect = useCallback(
    (session: Session) => {
      close();
      navigate(`/sessions/${session.id}`);
    },
    [close, navigate]
  );

  if (loading) {
    return (
      <box flexDirection="column">
        <text attributes={TextAttributes.DIM}>Loading sessions...</text>
      </box>
    );
  }

  return (
    <DialogSearchList
      items={sessions}
      onSelect={handleSelect}
      filterFn={(s, query) =>
        s.title.toLowerCase().includes(query.toLowerCase())
      }
      renderItem={(session, isSelected) => (
        <>
          <text selectable={false} fg={isSelected ? "black" : "white"}>
            {session.title}
          </text>
          <box flexGrow={1} />
          <text
            selectable={false}
            fg={isSelected ? "black" : undefined}
            attributes={TextAttributes.DIM}
          >
            {format(new Date(session.createdAt), "hh:mm a")}
          </text>
        </>
      )}
      getKey={(s) => s.id}
      placeholder="Search sessions"
      emptyText="No matching sessions"
    />
  );
};
