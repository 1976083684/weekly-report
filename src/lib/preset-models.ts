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
        usageCheck: {
          enabled: false,
          timeout: 10,
          interval: 5,
          block: `({
  request: {
    url: "https://open.bigmodel.cn/api/biz/tokenAccounts/list/my?pageNum=1&pageSize=50&filterEnabled=false",
    method: "GET",
    headers: {
      "Authorization": "Bearer {{apiKey}}",
      "User-Agent": "cc-switch/1.0"
    }
  },
  extractor: function(response) {
    if (response.code !== 200) return { remaining: "", unit: "", error: response.msg || "查询失败" };
    var rows = response.rows || [];
    if (rows.length === 0) return { remaining: "无有效资源包", unit: "", error: "暂无启用的资源包，请前往控制台查看现金余额" };
    var totalTokens = 0;
    var hasActive = false;
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      if (r.status !== "EXPIRED") {
        hasActive = true;
        totalTokens += Number(r.tokenBalance) || 0;
      }
    }
    if (!hasActive) {
      // 全部过期时，以 filterEnabled=false 再汇总所有
      totalTokens = 0;
      for (var j = 0; j < rows.length; j++) {
        totalTokens += Number(rows[j].tokenBalance) || 0;
      }
      return { remaining: "所有资源包已过期", unit: "tokens", error: "所有" + rows.length + "个资源包均已过期，请充值" };
    }
    if (totalTokens >= 1000000) return { remaining: (totalTokens / 1000000).toFixed(1) + "M", unit: "tokens" };
    if (totalTokens >= 1000) return { remaining: (totalTokens / 1000).toFixed(0) + "K", unit: "tokens" };
    return { remaining: String(totalTokens), unit: "tokens" };
  }
})`,
        },
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
