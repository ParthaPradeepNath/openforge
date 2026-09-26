export const EmptyBorder = {
  topLeft: "",
  bottomLeft: "",
  vertical: "",
  topRight: "",
  bottomRight: "",
  horizontal: " ",
  bottomT: "",
  topT: "",
  cross: "",
  leftT: "",
  rightT: "",
};

export const LightBorderChars = {
  ...EmptyBorder,
  topLeft: "┌",
  topRight: "┐",
  bottomLeft: "└",
  bottomRight: "┘",
  horizontal: "─",
  vertical: "│",
  topT: "┬",
  bottomT: "┴",
  leftT: "├",
  rightT: "┤",
  cross: "┼",
};

export const RoundedBorderChars = {
  ...EmptyBorder,
  topLeft: "╭",
  topRight: "╮",
  bottomLeft: "╰",
  bottomRight: "╯",
  horizontal: "─",
  vertical: "│",
  topT: "┬",
  bottomT: "┴",
  leftT: "├",
  rightT: "┤",
  cross: "┼",
};

export const ThickBorderChars = {
  ...EmptyBorder,
  topLeft: "┏",
  topRight: "┓",
  bottomLeft: "┗",
  bottomRight: "┛",
  horizontal: "━",
  vertical: "┃",
  topT: "┳",
  bottomT: "┻",
  leftT: "┣",
  rightT: "┫",
  cross: "╋",
};

export const DoubleBorderChars = {
  ...EmptyBorder,
  topLeft: "╔",
  topRight: "╗",
  bottomLeft: "╚",
  bottomRight: "╝",
  horizontal: "═",
  vertical: "║",
  topT: "╦",
  bottomT: "╩",
  leftT: "╠",
  rightT: "╣",
  cross: "╬",
};

export const DashedBorderChars = {
  ...EmptyBorder,
  topLeft: "┌",
  topRight: "┐",
  bottomLeft: "└",
  bottomRight: "┘",
  horizontal: "╌",
  vertical: "╎",
  topT: "┬",
  bottomT: "┴",
  leftT: "├",
  rightT: "┤",
  cross: "┼",
};

export const DottedBorderChars = {
  ...EmptyBorder,
  topLeft: "┌",
  topRight: "┐",
  bottomLeft: "└",
  bottomRight: "┘",
  horizontal: "┈",
  vertical: "┊",
  topT: "┬",
  bottomT: "┴",
  leftT: "├",
  rightT: "┤",
  cross: "┼",
};

export const HeavyRoundedBorderChars = {
  ...EmptyBorder,
  topLeft: "╭",
  topRight: "╮",
  bottomLeft: "╰",
  bottomRight: "╯",
  horizontal: "━",
  vertical: "┃",
  topT: "┳",
  bottomT: "┻",
  leftT: "┣",
  rightT: "┫",
  cross: "╋",
};

export const SplitBorderChars = {
  ...EmptyBorder,
  vertical: "┃",
};

export const ThinSplitBorderChars = {
  ...EmptyBorder,
  vertical: "│",
};

export const DoubleSplitBorderChars = {
  ...EmptyBorder,
  vertical: "║",
};

export const HeavySplitBorderChars = {
  ...EmptyBorder,
  vertical: "█",
};
