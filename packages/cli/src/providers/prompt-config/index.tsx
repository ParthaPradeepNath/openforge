import { createContext, useCallback, useContext, useState } from "react";
import type { ReactNode } from "react";

import { Mode } from "@openforge/database/enums";
import {
  DEFAULT_CHAT_MODEL_ID,
  type SupportedChatModelId,
} from "@openforge/shared";

type PromptConfigContextValue = {
  mode: Mode;
  toggleMode: () => void;
  setMode: (mode: Mode) => void;
  model: SupportedChatModelId;
  setModel: (model: SupportedChatModelId) => void;
};

const PromptConfigContet = createContext<PromptConfigContextValue | null>(null);

export function usePromptConfig(): PromptConfigContextValue {
  const value = useContext(PromptConfigContet);
  if (!value) {
    throw new Error(
      "usePromptConfig must be used within a PromptConfigProvider"
    );
  }

  return value;
}

type PromptConfigProviderProps = {
  children: ReactNode;
};

export function PromptConfigProvider({ children }: PromptConfigProviderProps) {
  const [mode, setMode] = useState<Mode>(Mode.BUILD);
  const [model, setModel] = useState<SupportedChatModelId>(
    DEFAULT_CHAT_MODEL_ID
  );

  // toggle will switch mode vice-versa
  const toggleMode = useCallback(() => {
    setMode((m) => (m === Mode.BUILD ? Mode.PLAN : Mode.BUILD));
  }, []);

  return (
    <PromptConfigContet.Provider
      value={{
        mode,
        toggleMode,
        setMode,
        model,
        setModel,
      }}
    >
      {children}
    </PromptConfigContet.Provider>
  );
}
