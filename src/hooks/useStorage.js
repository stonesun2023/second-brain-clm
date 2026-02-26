import { useState, useEffect } from 'react';
import { STORAGE_KEY, THEME_KEY } from '../utils/data.js';

// 初始数据
const INIT_ITEMS = [
  { id:1, cat:"spark", text:"用长焦拍晨雾中的建筑轮廓，光比要极端", time:"08:12", done:false, priority:"高", deadline:"", agentNote:null },
  { id:2, cat:"task",  text:"回复客户 Q1 提案，周四前必须发出",       time:"09:30", done:false, priority:"高", deadline:"2026-02-28", agentNote:null },
  { id:3, cat:"news",  text:"OpenAI 发布 o3，推理能力大幅提升",        time:"10:05", done:false, priority:"中", deadline:"", agentNote:null },
  { id:4, cat:"read",  text:"《置身事内》第三章：理解地方政府财政逻辑", time:"11:20", done:true,  priority:"低", deadline:"", agentNote:null },
  { id:5, cat:"photo", text:"整理上周外拍 RAW 文件，筛选 20 张做后期", time:"14:00", done:false, priority:"中", deadline:"2026-02-27", agentNote:null },
  { id:6, cat:"task",  text:"准备下周一团队会议 PPT 框架",             time:"16:40", done:false, priority:"高", deadline:"2026-03-01", agentNote:null },
  { id:7, cat:"spark", text:"播客选题：AI 时代个人知识管理的范式转移", time:"19:10", done:false, priority:"中", deadline:"", agentNote:null },
  { id:8, cat:"task",  text:"联系打印店确认样本尺寸",                   time:"20:00", done:true,  priority:"低", deadline:"", agentNote:null },
];

// 管理条目数据的持久化
export function useItems() {
  const [items, setItems] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : INIT_ITEMS;
    } catch (e) {
      return INIT_ITEMS;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      // 忽略存储错误
    }
  }, [items]);

  return [items, setItems];
}

// 管理主题的持久化
export function useTheme() {
  const [isDark, setIsDark] = useState(() => {
    try {
      const saved = localStorage.getItem(THEME_KEY);
      return saved === "dark";
    } catch (e) {
      return false; // 默认浅色主题
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(THEME_KEY, isDark ? "dark" : "light");
    } catch (e) {
      // 忽略存储错误
    }
  }, [isDark]);

  return [isDark, setIsDark];
}