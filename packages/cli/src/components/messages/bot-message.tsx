import { Mode } from "@openforge/database/enums";
import { TextAttributes } from "@opentui/core";

import type { ClientMessagePart } from "../../hooks/use-chat";
import { useTheme } from "../../providers/theme";
import { EmptyBorder } from "../border";

type Props = {
  parts: ClientMessagePart[];
  model: string;
  mode: Mode;
  duration?: string;
  streaming?: boolean;
};

export function BotMessage({
  parts,
  model,
  mode,
  duration,
  streaming = false,
}: Props) {
  const { colors } = useTheme();
  // re-contructing the text that need to be rendered back
  const text = parts
    .filter((p) => p.type === "text")
    .map((p) => p.text)
    .join("");

  return (
    <box width="100%" alignItems="center">
      <box paddingY={1} width="100%">
        <box paddingX={3} width="100%">
          <text>{text}</text>
        </box>
      </box>

      <box paddingX={3} paddingBottom={1} gap={1} width="100%">
        <box flexDirection="row" gap={2}>
          <text fg={mode === Mode.PLAN ? colors.planMode : colors.primary}>
            ●
          </text>
          <box flexDirection="row" gap={1}>
            <text attributes={TextAttributes.DIM} fg={colors.dimSeparator}>
              `{">"}`
            </text>
            <text attributes={TextAttributes.DIM}>{model}</text>
            {duration && (
              <>
                <text attributes={TextAttributes.DIM} fg={colors.dimSeparator}>
                  `{">"}`
                </text>
              </>
            )}
          </box>
        </box>
      </box>
    </box>
  );
}
