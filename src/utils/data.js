// src/utils/data.js
// 默认类目配置
const DEFAULT_CATS = [
  { id:"spark", label:"灵感", icon:"💡", color:"#F5C518" },
  { id:"task",  label:"任务", icon:"✅", color:"#3A8A5A" },
  { id:"news",  label:"资讯", icon:"📰", color:"#3B82F6" },
  { id:"read",  label:"阅读", icon:"📚", color:"#8B5CF6" },
  { id:"photo", label:"影像", icon:"📷", color:"#EF4444" },
];

// 从 localStorage 读取类目，如果没有则返回默认值
export function loadCats() {
  try {
    const stored = localStorage.getItem("SECOND_BRAIN_CATS");
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.warn("Failed to load cats from localStorage:", e);
  }
  return DEFAULT_CATS;
}

// 保存类目到 localStorage
export function saveCats(cats) {
  try {
    localStorage.setItem("SECOND_BRAIN_CATS", JSON.stringify(cats));
  } catch (e) {
    console.warn("Failed to save cats to localStorage:", e);
  }
}

// 导出当前类目列表（从 localStorage 读取或使用默认值）
export const CATS = loadCats();
export const WEEK = ["一","二","三","四","五","六","日"];
export const STORAGE_KEY = "sb-items-v4";
export const THEME_KEY   = "sb-theme-v4";
export const MODEL_KEY   = "sb-model-v4";
export const APIKEY_PRE  = "sb-apikey-v4-";
export const ARCHIVE_KEY = "sb-archive-v1";
export const catInfo = (id) => CATS.find(c=>c.id===id) || { color:"#888", icon:"·", label:id };