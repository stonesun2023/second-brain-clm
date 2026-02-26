import { MODEL_KEY, APIKEY_PRE } from './data.js';

// Supported models with their API configs
export const MODELS = [
  {
    id:"claude-sonnet",   label:"Claude Sonnet",  provider:"anthropic",
    endpoint:"https://api.anthropic.com/v1/messages",
    model:"claude-sonnet-4-20250514", free:false, region:"需科学上网",
    keyPlaceholder:"sk-ant-...",
  },
  {
    id:"gemini-flash",    label:"Gemini Flash",   provider:"google",
    endpoint:"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
    model:"gemini-2.0-flash", free:true, region:"国内部分可用",
    keyPlaceholder:"AIza...",
  },
  {
    id:"deepseek-chat",   label:"DeepSeek Chat",  provider:"openai-compat",
    endpoint:"https://api.deepseek.com/v1/chat/completions",
    model:"deepseek-chat", free:false, region:"国内直连 ✅",
    keyPlaceholder:"sk-...",
  },
  {
    id:"kimi-moonshot",   label:"Kimi (Moonshot)", provider:"openai-compat",
    endpoint:"https://api.moonshot.cn/v1/chat/completions",
    model:"moonshot-v1-8k", free:false, region:"国内直连 ✅",
    keyPlaceholder:"sk-...",
  },
  {
    id:"glm-4-flash",     label:"GLM-4 Flash",    provider:"openai-compat",
    endpoint:"https://open.bigmodel.cn/api/paas/v4/chat/completions",
    model:"glm-4-flash", free:true, region:"国内直连 ✅ 有免费额度",
    keyPlaceholder:"填入你的 GLM API Key",
    note:"新版 Key 直接粘贴即可，无需额外处理",
  },
];

// Universal AI call — handles all providers transparently
export async function callAI({ modelId, apiKey, system, userContent, maxTokens = 400 }) {
  const m = MODELS.find(x => x.id === modelId) || MODELS[0];

  // ── Anthropic ──
  if (m.provider === "anthropic") {
    const res = await fetch(m.endpoint, {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({
        model: m.model, max_tokens: maxTokens,
        system,
        messages:[{ role:"user", content: userContent }],
      })
    });
    if (!res.ok) { const e=await res.json(); throw new Error(e.error?.message||`HTTP ${res.status}`); }
    const data = await res.json();
    return data.content?.[0]?.text || "";
  }

  // ── Google Gemini ──
  if (m.provider === "google") {
    const url = `${m.endpoint}?key=${apiKey}`;
    const res = await fetch(url, {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({
        system_instruction:{ parts:[{ text: system }] },
        contents:[{ role:"user", parts:[{ text: userContent }] }],
        generationConfig:{ maxOutputTokens: maxTokens },
      })
    });
    if (!res.ok) { const e=await res.json(); throw new Error(e.error?.message||`HTTP ${res.status}`); }
    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  }

  // ── OpenAI-compatible (DeepSeek / Kimi / GLM) ──
  const res = await fetch(m.endpoint, {
    method:"POST",
    headers:{
      "Content-Type":"application/json",
      "Authorization":`Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: m.model, max_tokens: maxTokens,
      messages:[
        { role:"system", content: system },
        { role:"user",   content: userContent },
      ],
    })
  });
  if (!res.ok) { const e=await res.json(); throw new Error(e.error?.message||`HTTP ${res.status}`); }
  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}