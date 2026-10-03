// export type ModelPricing = {
//   inputUsdPerMillionTokens: number;
//   outputUsdPerMillionTokens: number;
// };

// export type SupportedProvider =
//   "anthropic" | "openai" | "google" | "deepseek" | "mistral" | "xai";

// type SupportedChatModelDefinition = {
//   id: string;
//   provider: SupportedProvider;
//   pricing: ModelPricing;
// };

// // We can maintain a margin because providers may offer
// // prompt caching and other discounted pricing.
// // The user-facing price can be different from our provider cost.
// export const SUPPORTED_CHAT_MODELS = [
//   {
//     id: "claude-sonnet-4-6",
//     provider: "anthropic",
//     pricing: {
//       inputUsdPerMillionTokens: 3,
//       outputUsdPerMillionTokens: 15,
//     },
//   },
//   {
//     id: "claude-opus-4-6",
//     provider: "anthropic",
//     pricing: {
//       inputUsdPerMillionTokens: 5,
//       outputUsdPerMillionTokens: 25,
//     },
//   },
//   {
//     id: "claude-haiku-4-5",
//     provider: "anthropic",
//     pricing: {
//       inputUsdPerMillionTokens: 1,
//       outputUsdPerMillionTokens: 5,
//     },
//   },
//   {
//     id: "gpt-5.4",
//     provider: "openai",
//     pricing: {
//       inputUsdPerMillionTokens: 2.5,
//       outputUsdPerMillionTokens: 15,
//     },
//   },
//   {
//     id: "gpt-5.4-mini",
//     provider: "openai",
//     pricing: {
//       inputUsdPerMillionTokens: 0.4,
//       outputUsdPerMillionTokens: 1.6,
//     },
//   },
//   {
//     id: "gpt-5.4-nano",
//     provider: "openai",
//     pricing: {
//       inputUsdPerMillionTokens: 0.1,
//       outputUsdPerMillionTokens: 0.4,
//     },
//   },
//   {
//     id: "gpt-5.3-codex",
//     provider: "openai",
//     pricing: {
//       inputUsdPerMillionTokens: 1.75,
//       outputUsdPerMillionTokens: 14,
//     },
//   },
//   {
//     id: "gemini-3.1-pro",
//     provider: "google",
//     pricing: {
//       inputUsdPerMillionTokens: 2,
//       outputUsdPerMillionTokens: 12,
//     },
//   },
//   {
//     id: "gemini-3.1-flash",
//     provider: "google",
//     pricing: {
//       inputUsdPerMillionTokens: 0.5,
//       outputUsdPerMillionTokens: 3,
//     },
//   },
//   {
//     id: "gemini-2.5-pro",
//     provider: "google",
//     pricing: {
//       inputUsdPerMillionTokens: 1.25,
//       outputUsdPerMillionTokens: 10,
//     },
//   },
//   {
//     id: "gemini-2.5-flash",
//     provider: "google",
//     pricing: {
//       inputUsdPerMillionTokens: 0.3,
//       outputUsdPerMillionTokens: 2.5,
//     },
//   },
//   {
//     id: "deepseek-chat",
//     provider: "deepseek",
//     pricing: {
//       inputUsdPerMillionTokens: 0.28,
//       outputUsdPerMillionTokens: 0.42,
//     },
//   },
//   {
//     id: "deepseek-reasoner",
//     provider: "deepseek",
//     pricing: {
//       inputUsdPerMillionTokens: 0.55,
//       outputUsdPerMillionTokens: 2.19,
//     },
//   },
//   {
//     id: "mistral-large-latest",
//     provider: "mistral",
//     pricing: {
//       inputUsdPerMillionTokens: 2,
//       outputUsdPerMillionTokens: 6,
//     },
//   },
//   {
//     id: "grok-4",
//     provider: "xai",
//     pricing: {
//       inputUsdPerMillionTokens: 3,
//       outputUsdPerMillionTokens: 15,
//     },
//   },
// ] as const satisfies readonly SupportedChatModelDefinition[];

// export type SupportedChatModel = (typeof SUPPORTED_CHAT_MODELS)[number];

// export type SupportedChatModelId = SupportedChatModel["id"];
// export function findSupportedChatModel(modelId: string) {
//   return SUPPORTED_CHAT_MODELS.find((model) => model.id === modelId);
// }

// export const DEFAULT_CHAT_MODEL_ID: SupportedChatModelId = "claude-opus-4-6";

export type ModelPricing = {
  inputUsdPerMillionTokens: number;
  outputUsdPerMillionTokens: number;
};

export type SupportedProvider = "anthropic" | "openai";

type SupportedChatModelDefinition = {
  id: string;
  provider: SupportedProvider;
  pricing: ModelPricing;
};

export const SUPPORTED_CHAT_MODELS = [
  {
    id: "claude-sonnet-4-6",
    provider: "anthropic",
    pricing: {
      inputUsdPerMillionTokens: 3,
      outputUsdPerMillionTokens: 15,
    },
  },
  {
    id: "claude-haiku-4-5",
    provider: "anthropic",
    pricing: {
      inputUsdPerMillionTokens: 1,
      outputUsdPerMillionTokens: 5,
    },
  },
  {
    id: "claude-opus-4-6",
    provider: "anthropic",
    pricing: {
      inputUsdPerMillionTokens: 5,
      outputUsdPerMillionTokens: 25,
    },
  },
  {
    id: "gpt-5.4",
    provider: "openai",
    pricing: {
      inputUsdPerMillionTokens: 2.5,
      outputUsdPerMillionTokens: 15,
    },
  },
  {
    id: "gpt-5.4-mini",
    provider: "openai",
    pricing: {
      inputUsdPerMillionTokens: 0.75,
      outputUsdPerMillionTokens: 4.5,
    },
  },
  {
    id: "gpt-5.4-nano",
    provider: "openai",
    pricing: {
      inputUsdPerMillionTokens: 0.2,
      outputUsdPerMillionTokens: 1.25,
    },
  },
] as const satisfies readonly SupportedChatModelDefinition[];

export type SupportedChatModel = (typeof SUPPORTED_CHAT_MODELS)[number];
export type SupportedChatModelId = SupportedChatModel["id"];

export function findSupportedChatModel(modelId: string) {
  return SUPPORTED_CHAT_MODELS.find((model) => model.id === modelId);
}

export const DEFAULT_CHAT_MODEL_ID: SupportedChatModelId = "claude-opus-4-6";