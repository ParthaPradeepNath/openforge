export type ThemeColors = {
  primary: string;
  planMode: string;
  selection: string;
  thinking: string;
  success: string;
  error: string;
  info: string;
  background: string;
  surface: string;
  dialogSurface: string;
  thinkingBorder: string;
  dimSeparator: string;
};

export type Theme = {
  name: string;
  colors: ThemeColors;
};

export const THEMES: Theme[] = [
  // 1. CodeForge — Cyan / Purple
  {
    name: "CodeForge",
    colors: {
      primary: "#00D4FF",
      planMode: "#A78BFA",
      selection: "#123047",
      thinking: "#C084FC",
      success: "#22C55E",
      error: "#F43F5E",
      info: "#38BDF8",
      background: "#080B12",
      surface: "#0F141D",
      dialogSurface: "#151C27",
      thinkingBorder: "#8B5CF6",
      dimSeparator: "#1E293B",
    },
  },

  // 2. Nightfox — Blue / Purple
  {
    name: "Nightfox",
    colors: {
      primary: "#7AA2F7",
      planMode: "#BB9AF7",
      selection: "#2A2F4A",
      thinking: "#BB9AF7",
      success: "#9ECE6A",
      error: "#F7768E",
      info: "#7DCFFF",
      background: "#0D0E14",
      surface: "#161821",
      dialogSurface: "#1A1B26",
      thinkingBorder: "#BB9AF7",
      dimSeparator: "#292E42",
    },
  },

  // 3. Dracula — Purple / Pink
  {
    name: "Dracula",
    colors: {
      primary: "#BD93F9",
      planMode: "#FF79C6",
      selection: "#44475A",
      thinking: "#FF79C6",
      success: "#50FA7B",
      error: "#FF5555",
      info: "#8BE9FD",
      background: "#282A36",
      surface: "#303241",
      dialogSurface: "#343746",
      thinkingBorder: "#BD93F9",
      dimSeparator: "#44475A",
    },
  },

  // 4. Tokyo Night — Blue / Cyan
  {
    name: "Tokyo Night",
    colors: {
      primary: "#7AA2F7",
      planMode: "#BB9AF7",
      selection: "#283457",
      thinking: "#7DCFFF",
      success: "#9ECE6A",
      error: "#F7768E",
      info: "#2AC3DE",
      background: "#1A1B26",
      surface: "#16161E",
      dialogSurface: "#24283B",
      thinkingBorder: "#7DCFFF",
      dimSeparator: "#292E42",
    },
  },

  // 5. Catppuccin Mocha — Soft Purple
  {
    name: "Catppuccin Mocha",
    colors: {
      primary: "#89B4FA",
      planMode: "#CBA6F7",
      selection: "#313244",
      thinking: "#F5C2E7",
      success: "#A6E3A1",
      error: "#F38BA8",
      info: "#89DCEB",
      background: "#11111B",
      surface: "#181825",
      dialogSurface: "#1E1E2E",
      thinkingBorder: "#CBA6F7",
      dimSeparator: "#313244",
    },
  },

  // 6. Nord — Arctic Blue
  {
    name: "Nord",
    colors: {
      primary: "#88C0D0",
      planMode: "#B48EAD",
      selection: "#3B4252",
      thinking: "#81A1C1",
      success: "#A3BE8C",
      error: "#BF616A",
      info: "#81A1C1",
      background: "#2E3440",
      surface: "#3B4252",
      dialogSurface: "#434C5E",
      thinkingBorder: "#81A1C1",
      dimSeparator: "#4C566A",
    },
  },

  // 7. Gruvbox — Warm Orange / Green
  {
    name: "Gruvbox",
    colors: {
      primary: "#83A598",
      planMode: "#D3869B",
      selection: "#3C3836",
      thinking: "#D79921",
      success: "#B8BB26",
      error: "#FB4934",
      info: "#83A598",
      background: "#1D2021",
      surface: "#282828",
      dialogSurface: "#32302F",
      thinkingBorder: "#D79921",
      dimSeparator: "#504945",
    },
  },

  // 8. Matrix — Green / Black
  {
    name: "Matrix",
    colors: {
      primary: "#00FF41",
      planMode: "#00CC33",
      selection: "#12351D",
      thinking: "#00FF41",
      success: "#39FF14",
      error: "#FF3333",
      info: "#00FF88",
      background: "#050805",
      surface: "#0A100A",
      dialogSurface: "#0D160D",
      thinkingBorder: "#00CC33",
      dimSeparator: "#183018",
    },
  },

  // 9. Cyberpunk — Pink / Cyan
  {
    name: "Cyberpunk",
    colors: {
      primary: "#00F0FF",
      planMode: "#FF00FF",
      selection: "#24203A",
      thinking: "#FF00CC",
      success: "#00FF9C",
      error: "#FF3864",
      info: "#00E5FF",
      background: "#080812",
      surface: "#11111F",
      dialogSurface: "#19192B",
      thinkingBorder: "#FF00FF",
      dimSeparator: "#292943",
    },
  },

  // 10. One Dark — Classic Developer
  {
    name: "One Dark",
    colors: {
      primary: "#61AFEF",
      planMode: "#C678DD",
      selection: "#3E4451",
      thinking: "#C678DD",
      success: "#98C379",
      error: "#E06C75",
      info: "#56B6C2",
      background: "#21252B",
      surface: "#282C34",
      dialogSurface: "#2C313C",
      thinkingBorder: "#C678DD",
      dimSeparator: "#3E4451",
    },
  },
];

export const DEFAULT_THEME: Theme = THEMES.find((t) => t.name === "Nightfox")!;
