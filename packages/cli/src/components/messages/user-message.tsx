import { Mode } from "@openforge/database/enums";

import { useTheme } from "../../providers/theme";
import { EmptyBorder } from "../border";

type Props = {
  message: string;
  mode: Mode;
};

// Mode that the message was sent at that time
export function UserMessage({ message, mode }: Props) {
  const { colors } = useTheme();

  return (
    <box width="100%" alignItems="center">
      <box
        border={["left"]}
        borderColor={mode === Mode.PLAN ? colors.planMode : colors.primary}
        width="100%"
        customBorderChars={{
          ...EmptyBorder,
          vertical: "┃",
        }}
      >
        <box
          justifyContent="center"
          paddingX={2}
          paddingY={1}
          backgroundColor={colors.surface}
          width="100%"
        >
          <text>{message}</text>
        </box>
      </box>
    </box>
  );
}
