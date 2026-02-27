import { callAI } from './ai.js';

// 识别文本中的地址/地点信息
export async function extractLocation(text, aiConfig) {
  try {
    const prompt = `请识别以下文本中是否包含具体的地点信息（如商场、餐厅、公司、景点、地址等），并返回JSON格式结果。

文本：${text}

要求：
1. 只识别具体的地点名称，不要识别时间、人物、事件等
2. 如果包含地点，返回 {"hasLocation": true, "locationName": "地点名称"}
3. 如果不包含地点，返回 {"hasLocation": false, "locationName": ""}

注意：只返回纯JSON，不要任何解释或额外文字。`;
    
    const result = await callAI({
      modelId: aiConfig.modelId,
      apiKey: aiConfig.apiKey,
      system: "你是一个地点信息识别专家，专门识别文本中的具体地点名称。",
      userContent: prompt,
      maxTokens: 100,
    });
    
    // 清理可能的 markdown 代码块包裹
    const clean = result.replace(/```json|```/g, "").trim();
    
    // 尝试解析 JSON
    let parsedResult;
    try {
      parsedResult = JSON.parse(clean);
    } catch (e) {
      // 如果解析失败，返回默认值
      parsedResult = { hasLocation: false, locationName: "" };
    }
    
    return parsedResult;
  } catch (e) {
    console.error('地点识别失败:', e);
    return { hasLocation: false, locationName: "" };
  }
}

// 生成高德地图搜索跳转链接
export function buildAmapUrl(locationName) {
  if (!locationName || locationName.trim() === "") {
    return "";
  }
  const encodedName = encodeURIComponent(locationName.trim());
  return `https://uri.amap.com/search?keyword=${encodedName}&dev=0&t=0`;
}