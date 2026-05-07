export interface PresetModel {
  provider: string;
  modelName: string;
  website: string;
  baseUrl: string;
  notes: string;
  haikuModel: string;
  sonnetModel: string;
  opusModel: string;
  configJson: string;
  isBuiltIn: true;
}

export const PRESET_MODELS: Record<string, PresetModel> = {
  deepseek: {
    provider: "DeepSeek",
    modelName: "deepseek-chat",
    website: "https://platform.deepseek.com",
    baseUrl: "https://api.deepseek.com/v1",
    notes: "DeepSeek 高性能大模型，每日500万tokens免费额度",
    haikuModel: "deepseek-chat",
    sonnetModel: "deepseek-chat",
    opusModel: "deepseek-chat",
    configJson: JSON.stringify(
      {
        env: {
          ANTHROPIC_BASE_URL: "https://api.deepseek.com/anthropic",
          ANTHROPIC_AUTH_TOKEN: "",
          ANTHROPIC_MODEL: "deepseek-chat",
          ANTHROPIC_DEFAULT_HAIKU_MODEL: "deepseek-chat",
          ANTHROPIC_DEFAULT_SONNET_MODEL: "deepseek-chat",
          ANTHROPIC_DEFAULT_OPUS_MODEL: "deepseek-chat",
        },
        extraKnownMarketplaces: {},
        skipDangerousModePermissionPrompt: true,
      },
      null,
      2
    ),
    isBuiltIn: true,
  },
  zhipu: {
    provider: "智谱AI",
    modelName: "GLM-4.7-Flash",
    website: "https://open.bigmodel.cn",
    baseUrl: "https://open.bigmodel.cn/api/paas/v4",
    notes: "智谱AI 免费模型，适合日常使用（API Key 需自行获取）",
    haikuModel: "GLM-4.7-Flash",
    sonnetModel: "GLM-4.7-Flash",
    opusModel: "GLM-4.7-Flash",
    configJson: JSON.stringify(
      {
        env: {
          ANTHROPIC_BASE_URL: "",
          ANTHROPIC_AUTH_TOKEN: "",
          ANTHROPIC_MODEL: "GLM-4.7-Flash",
          ANTHROPIC_DEFAULT_HAIKU_MODEL: "GLM-4.7-Flash",
          ANTHROPIC_DEFAULT_SONNET_MODEL: "GLM-4.7-Flash",
          ANTHROPIC_DEFAULT_OPUS_MODEL: "GLM-4.7-Flash",
        },
        extraKnownMarketplaces: {},
        skipDangerousModePermissionPrompt: true,
      },
      null,
      2
    ),
    isBuiltIn: true,
  },
};

export const PRESET_LIST = Object.entries(PRESET_MODELS).map(([key, val]) => ({
  key,
  provider: val.provider,
  modelName: val.modelName,
  notes: val.notes,
}));
