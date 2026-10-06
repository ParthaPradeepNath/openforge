import { useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router";

import { type KeyBinding, TextareaRenderable } from "@opentui/core";
import { useRenderer } from "@opentui/react";

import { useDialog } from "../providers/dialog";
import { useKeyboardLayer } from "../providers/keyboard-layer";
import { useTheme } from "../providers/theme";
import { useToast } from "../providers/toast";
import { DoubleBorderChars } from "./border";
import { CommandMenu } from "./command-menu";
import type { Command } from "./command-menu/types";
import { useCommandMenu } from "./command-menu/use-command-menu";
import { StatusBar } from "./status-bar";

type Props = {
  onSubmit: (text: string) => void;
  disabled?: boolean;
};

export const TEXTAREA_KEY_BINDINGS: KeyBinding[] = [
  { name: "return", action: "submit" },
  { name: "enter", action: "submit" },
  { name: "return", shift: true, action: "newline" },
  { name: "enter", shift: true, action: "newline" },
];

export function InputBar({ onSubmit, disabled = false }: Props) {
  const textareaRef = useRef<TextareaRenderable>(null);
  const onSubmitRef = useRef<() => void>(() => {});
  const renderer = useRenderer();
  const toast = useToast();
  const navigate = useNavigate();
  const dialog = useDialog();
  const { isTopLayer, setResponder } = useKeyboardLayer();
  const { colors } = useTheme();

  const {
    showCommandMenu,
    commandQuery,
    selectedIndex,
    scrollRef,
    handleContentChange,
    resolveCommand,
    setSelectedIndex,
  } = useCommandMenu();

  // Kept in a ref so the stable content-change callback always reads the latest
  // handleContentChange instead of the one captured on first render.
  const handleContentChangeRef = useRef(handleContentChange);
  handleContentChangeRef.current = handleContentChange;

  const handleTextareaContentChange = useCallback(() => {
    // we are tracking or looking for the "/" to be able to open the command-menu
    // and we need to take the value using ref otherwise we get a stale value
    const textarea = textareaRef.current;
    if (!textarea) return;

    handleContentChangeRef.current(textarea.plainText);
  }, []);

  const handleSubmit = useCallback(() => {
    if (disabled) return;

    const textarea = textareaRef.current;
    if (!textarea) return;

    const text = textarea.plainText.trim();
    if (text.length === 0) return;

    onSubmit(text);
    // after submittion we clear the textarea
    textarea.setText("");
  }, [disabled, onSubmit]);

  const handleCommand = useCallback(
    (command: Command | undefined) => {
      const textarea = textareaRef.current;
      if (!textarea || !command) return;

      textarea.setText("");

      if (command.action) {
        command.action({
          exit: () => renderer.destroy(),
          toast,
          dialog,
          navigate,
        });
      } else {
        textarea.insertText(command.value + " ");
      }
    },
    [renderer, toast, dialog, navigate]
  );

  // Kept in refs so the stable execute callback always reads the latest
  // resolveCommand/handleCommand instead of the ones captured on first render.
  const resolveCommandRef = useRef(resolveCommand);
  resolveCommandRef.current = resolveCommand;
  const handleCommandRef = useRef(handleCommand);
  handleCommandRef.current = handleCommand;

  const handleCommandExecute = useCallback((index: number) => {
    const command = resolveCommandRef.current(index);
    handleCommandRef.current(command);
  }, []);

  // Wire up textarea submit handler once so it always reads the latest state
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.onSubmit = () => {
      onSubmitRef.current();
    };
  }, []);

  onSubmitRef.current = () => {
    if (disabled) {
      return;
    }

    if (showCommandMenu) {
      const command = resolveCommand(selectedIndex);
      handleCommand(command);
      return;
    }

    handleSubmit();
  };

  // Register the base layer responder for ctrl + c dismissal
  useEffect(() => {
    setResponder("base", () => {
      if (disabled) return false;

      const textarea = textareaRef.current;
      if (textarea && textarea.plainText.length > 0) {
        textarea.setText("");
        return true;
      }
      return false;
    });

    return () => setResponder("base", null);
  }, [disabled, setResponder]);

  return (
    <box width="100%">
      {/* <box
      border={["left"]}
      borderColor="cyan"
      customBorderChars={{
        ...EmptyBorder,
        vertical: "│",
        bottomLeft: "└",
      }}
      > */}
      <box
        border={["left"]}
        borderColor={colors.primary}
        customBorderChars={DoubleBorderChars}
      >
        <box
          position="relative"
          justifyContent="center"
          paddingX={2}
          paddingY={1}
          backgroundColor={colors.surface}
          width="100%"
          gap={1}
        >
          {showCommandMenu && (
            <box
              position="absolute"
              bottom="100%"
              left={0}
              width="100%"
              backgroundColor={colors.surface}
              zIndex={10}
            >
              <CommandMenu
                query={commandQuery}
                selectedIndex={selectedIndex}
                scrollRef={scrollRef}
                onSelect={setSelectedIndex}
                onExecute={handleCommandExecute}
              />
            </box>
          )}
          <textarea
            focused={!disabled && (isTopLayer("base") || isTopLayer("command"))}
            keyBindings={TEXTAREA_KEY_BINDINGS}
            placeholder={`Ask anything... "Fix a bug in the authentication flow"`}
            ref={textareaRef}
            onContentChange={handleTextareaContentChange}
          />
          <StatusBar />
        </box>
      </box>
    </box>
  );
}
