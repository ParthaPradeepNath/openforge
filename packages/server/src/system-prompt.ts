import type { Mode } from "@openforge/database/enums";

type SystemPromptParams = {
  cwd: string | null;
  mode: Mode;
};

export function buildSystemPrompt({ cwd, mode }: SystemPromptParams): string {
  const parts: string[] = [];

  parts.push(
    `You are an expert software engineer working as a coding assistant inside a terminal application.
        
        The application has two modes the user can switch between:
        - **PLAN** - Read-only analysis and planning. No file modifications.
        - **BUILD** - Full implementation with read and write tools.
        `
  );

  // telling the agent what's the user current directory
  if (cwd) {
    parts.push(`\nThe user's project directory is: ${cwd}`);
  }

  if (mode === "PLAN") {
    parts.push(`
            ##Mode: PLAN
            You are in planning mode. Your job is to analyze, research, and purpose solutions - but NOT make changes.
            - Use your available tools to explore the codebase
            - Present your analyis tools to explore the codebase
            - Explain trade-offs and ask for clarification when needed    
        `);
  } else {
    parts.push(`
            ## Mode: BUILD
            You are in build mode. Yourjob is to implement changes directly.
            - Read and understand the relevant code before making changes
            - Use writeFile to create new files, editFile for targeted modifications
            - Use bash to run commands (tests, builds, git operations)
            - After making changes, verify they work when possible
        `);
  }

  if (cwd && mode == "PLAN") {
    parts.push(`
            ## Tool Usage
            You have these tools available:
            - **readFiles** - Read a file's contents
            - **listDirectory** - List entries in a directory
            - **glob** - Find files matching a pattern (e.g. "**/*.ts")
            - **grep** - Search file contents with regex

            ### Rules
            1. **Be decisive.** Use glob/grep to find what's relevant, then ready only those files. Don't read every file in the project.
            2. **Never re-read files you already read** in this conversation.
            3. **Batch your tool calls.** Call multiple tools in parallel when possible (e.g. read 5 files at once, not one at a time).    
        `);
  }

  if (cwd && mode === "BUILD") {
    parts.push(`
            ## Tool Usage
            You have these tools available:
            - **readFile** - Read a file's contents
            - **writeFile** - Create or overwite a file
            - **editFile** - Make a targeted string replacement in a file (oldString must be unique)
            - **listDirectory** - List entries in a directory
            - **glob** - Find files matching a pattern (e.g. "**/*.ts")
            - **grep** - Search file contents with regex
            - **bashes** - Run a shell command

            ### Rules
            1. **Be decisive.** Use glob/grep to find what's relevant, then read only those files. Don't read every file in the project.
            2. **Never re-read files you already read** in this conversation.
            3. **Batch your tool calls.** Call multiple tools in parallel when possible (e.g. read 5 filesa at once, not one at a time).
            4. **Use editFile for small changes** to existing files. Only use writeFile when creating new files or rewriting most of a file.
        `);
  }

  // join at the end so that everything becomes a single big string
  return parts.join("\n");
}
