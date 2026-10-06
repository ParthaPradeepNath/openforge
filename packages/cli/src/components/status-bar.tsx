import { Mode } from "@openforge/database/enums";
import { TextAttributes } from "@opentui/core";

import { usePromptConfig } from "../providers/prompt-config";
import { useTheme } from "../providers/theme";

export function StatusBar() {
  // Getting from the prompt-config context (using use-context)
  const { mode, model } = usePromptConfig();
  const { colors } = useTheme();

  return (
    <box flexDirection="row" gap={1}>
      <text fg={mode === Mode.PLAN ? colors.planMode : colors.primary}>
        {mode === Mode.PLAN ? "Plan" : "Build"}
      </text>
      <text attributes={TextAttributes.DIM} fg={colors.dimSeparator}>
        &gt;
      </text>
      <text>{model}</text>
    </box>
  );
}
