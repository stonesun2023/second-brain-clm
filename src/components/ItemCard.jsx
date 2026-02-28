import { useState, useRef, useCallback, useEffect } from 'react';
import { AGENTS, loadAgents } from '../utils/agents.js';
import { callAI } from '../utils/ai.js';
import { Spinner } from './shared/index.jsx';
import { useCats } from '../store/useItems.js';
import { catInfo } from '../utils/data.js';
import { extractLocation, buildAmapUrl } from '../utils/mapUtils.js';

// ─── ITEM CARD with Agent ─────────────────────────────────────────────────────
export default function ItemCard({ item, onToggle, onNote, autoMode, T, aiConfig, onArchive }) {
  const [loading, setLoading]     = useState(false);
  const [expanded, setExpanded]   = useState(false);
  const [displayed, setDisplayed] = useState(""); // typewriter text
  const [typing, setTyping]       = useState(false);
  const [bookInfo, setBookInfo]   = useState(null); // 书摘信息
  const [bookInfoLoading, setBookInfoLoading] = useState(false);
  const [linkSummary, setLinkSummary] = useState(null); // 链接摘要
  const [linkSummaryLoading, setLinkSummaryLoading] = useState(false);
  const c     = catInfo(item.cat);
  const agents = loadAgents();
  const agent = agents[item.cat] || { name: "未知", avatar: "❓", greeting: "", system: "" };
  const typingRef = useRef(null);

  // Auto-trigger
  useEffect(() => {
    if (autoMode && !item.agentNote && !item.done) callAgent();
  }, [autoMode]);

  // Typewriter effect when note arrives
  useEffect(() => {
    if (!item.agentNote || !expanded) return;
    const full = item.agentNote.text;
    if (displayed === full) return;
    setDisplayed("");
    setTyping(true);
    let i = 0;
    clearInterval(typingRef.current);
    typingRef.current = setInterval(() => {
      i++;
      setDisplayed(full.slice(0, i));
      if (i >= full.length) { clearInterval(typingRef.current); setTyping(false); }
    }, 18);
    return () => clearInterval(typingRef.current);
  }, [item.agentNote, expanded]);

  const callAgent = async () => {
    if (loading || item.agentNote) return;
    setLoading(true);
    try {
      const text = await callAI({
        modelId: aiConfig.modelId,
        apiKey:  aiConfig.apiKey,
        system:  agent.system,
        userContent: `我刚记下来这个：「${item.text}」`,
        maxTokens: 200,
      });
      onNote(item.id, {
        text,
        agent: item.cat,
        agentName: agent.name,
        greeting: agent.greeting,
        ts: new Date().toLocaleTimeString("zh-CN",{hour:"2-digit",minute:"2-digit"})
      });
      setExpanded(true);
    } catch(e) {
      onNote(item.id, { text:`❌ ${e.message}`, agent:item.cat, agentName:agent.name, greeting:"", ts:"" });
      setExpanded(true);
    } finally {
      setLoading(false);
    }
  };

  const clearNote = (e) => {
    e.stopPropagation();
    setDisplayed("");
    onNote(item.id, null);
  };

  const toggleExpand = () => {
    const next = !expanded;
    setExpanded(next);
    if (next && item.agentNote && displayed !== item.agentNote.text) {
      setDisplayed(item.agentNote.text); // show full on re-expand
    }
  };

  // 查出处功能 - 仅在 read 类目时显示
  const handleCheckSource = async () => {
    if (bookInfoLoading || bookInfo) return;
    setBookInfoLoading(true);
    try {
      const prompt = `请从以下文本中识别出书名、作者、出版年份（如果能推断）、所在章节（如能推断）、以及一句话核心观点。如果文本中没有识别到书籍信息，请返回"未识别到书籍信息"。

文本：${item.text}

请以JSON格式返回，包含以下字段：
- bookTitle: 书名
- author: 作者
- year: 出版年份（可选）
- chapter: 所在章节（可选）
- coreIdea: 一句话核心观点

如果未识别到书籍信息，请返回：{"message": "未识别到书籍信息"}`;
      
      const result = await callAI({
        modelId: aiConfig.modelId,
        apiKey: aiConfig.apiKey,
        system: "你是一个书籍信息专家。用户会给你一段读书笔记或书名，你需要根据你的知识库推断并返回书籍信息。\n\n规则：\n1. 即使信息不完整，也要尽力根据书名推断作者、年份等信息\n2. 如果能识别书名，作者和年份通常都能推断出来，不要轻易返回\"未识别\"\n3. 只返回纯 JSON，不加任何解释或 markdown\n\n返回格式：\n{\"bookTitle\":\"书名\",\"author\":\"作者\",\"year\":\"出版年份\",\"chapter\":\"章节（无法判断填空字符串）\",\"coreIdea\":\"用一句话说这本书最核心的观点\"}",
        userContent: prompt,
        maxTokens: 300,
      });
      
      // 清理可能的 markdown 代码块包裹
      const clean = result.replace(/```json|```/g, "").trim();
      
      // 尝试解析 JSON
      let parsedResult;
      try {
        parsedResult = JSON.parse(clean);
      } catch (e) {
        // 如果解析失败，尝试提取关键信息
        parsedResult = { message: clean };
      }
      
      setBookInfo(parsedResult);
    } catch (e) {
      setBookInfo({ message: `查询失败：${e.message}` });
    } finally {
      setBookInfoLoading(false);
    }
  };

  // 地点识别和导航功能
  const handleNavigate = async () => {
    try {
      const locationResult = await extractLocation(item.text, aiConfig);
      if (locationResult.hasLocation && locationResult.locationName) {
        const url = buildAmapUrl(locationResult.locationName);
        if (url) {
          window.open(url, '_blank');
        }
      }
    } catch (e) {
      console.error('导航失败:', e);
    }
  };

  // 链接摘要功能
  const handleGetSummary = async () => {
    try {
      const urlMatch = item.text.match(/https?:\/\/[^\s]+/);
      if (!urlMatch) return;
      
      const url = urlMatch[0];
      const prompt = `你是内容摘要助手。联网搜索用户提供的链接后，返回纯 JSON，不加任何 markdown 或解释：
{
  "verified": true或false,
  "topic": "一句话主题",
  "points": ["核心要点1", "核心要点2", "核心要点3"],
  "value": "对读者的价值"
}
如果搜索不到内容，返回：{"verified": false, "topic": "无法获取页面内容", "points": [], "value": "建议直接访问链接"}`;
      
      const result = await callAI({
        modelId: aiConfig.modelId,
        apiKey: aiConfig.apiKey,
        system: prompt,
        userContent: url,
        maxTokens: 300,
        enableWebSearch: true,
      });
      
      // 清理可能的 markdown 代码块包裹
      const clean = result.replace(/```json|```/g, "").trim();
      
      // 尝试解析 JSON
      let parsedResult;
      try {
        parsedResult = JSON.parse(clean);
      } catch (e) {
        // 如果解析失败，尝试提取关键信息
        parsedResult = { verified: false, topic: "解析失败", points: [], value: result };
      }
      
      setLinkSummary(parsedResult);
    } catch (e) {
      setLinkSummary({ verified: false, topic: "获取失败", points: [], value: `❌ ${e.message}` });
    } finally {
      setLinkSummaryLoading(false);
    }
  };

  const hasNote = !!item.agentNote;

  return (
    <div style={{ marginBottom:8 }}>
      {/* 照片展示区域 */}
      {item.photo && (
        <div style={{ 
          width: "100%", 
          height: 180, 
          overflow: "hidden", 
          borderRadius: "8px 8px 0 0",
          border: `1px solid ${T.border}`,
          borderBottom: "none"
        }}>
          <img 
            src={item.photo} 
            alt="照片" 
            style={{ 
              width: "100%", 
              height: "100%", 
              objectFit: "cover", 
              display: "block" 
            }} 
          />
        </div>
      )}
      {/* Main row */}
      <div style={{
        display:"flex", gap:10, padding:"10px 12px",
        background:T.surface,
        borderLeft:`3px solid ${item.done ? "transparent" : c.color}`,
        borderRadius: hasNote && expanded ? (item.photo ? "0 0 8px 8px" : "8px 8px 0 0") : (item.photo ? "0 0 8px 8px" : 8),
        border:`1px solid ${T.border}`,
        borderTop: item.photo ? "none" : `1px solid ${T.border}`,
        borderBottom: hasNote && expanded ? "none" : `1px solid ${T.border}`,
        opacity:item.done ? 0.45 : 1, transition:"opacity 0.2s",
      }}>
        {/* Check */}
        <div onClick={()=>onToggle(item.id)} style={{ paddingTop:3, cursor:"pointer", flexShrink:0 }}>
          <div style={{
            width:14, height:14, borderRadius:"50%",
            border:`2px solid ${item.done ? T.border2 : c.color}`,
            background:item.done ? T.surface2 : "transparent",
            display:"flex", alignItems:"center", justifyContent:"center",
          }}>
            {item.done && <div style={{ width:5,height:5,borderRadius:"50%",background:T.textDim }}/>}
          </div>
        </div>

        {/* Text */}
        <div style={{ flex:1, minWidth:0 }} onClick={()=>onToggle(item.id)}>
          <div style={{ fontSize:13, color:item.done?T.textDim:T.text, textDecoration:item.done?"line-through":"none", lineHeight:1.5, wordBreak:"break-all", cursor:"pointer" }}>
            {item.text}
          </div>
          <div style={{ display:"flex", gap:8, marginTop:4, alignItems:"center", flexWrap:"wrap" }}>
            <span style={{ fontSize:9, color:c.color }}>{c.icon} {c.label}</span>
            {item.priority==="高" && <span style={{ fontSize:8,color:"#CC4444",border:"1px solid #CC444430",padding:"1px 4px",borderRadius:3 }}>高优</span>}
            {item.deadline && <span style={{ fontSize:9,color:T.textDim }}>⏰{item.deadline}</span>}
            {hasNote && <span style={{ fontSize:9, color:c.color, opacity:0.7 }}>💬{agent?.name}</span>}
            <span style={{ fontSize:9,color:T.textDim,marginLeft:"auto" }}>{item.time}</span>
          </div>
        </div>

        {/* Agent btn */}
        {!item.done && (
          <div style={{ display:"flex", flexDirection:"column", gap:4, flexShrink:0, alignItems:"center" }}>
            <button
              onClick={hasNote ? toggleExpand : callAgent}
              disabled={loading}
              title={hasNote ? "查看 / 收起" : `召唤${agent?.name}`}
              style={{
                width:28, height:28, borderRadius:"50%", border:"none",
                background: hasNote ? c.color+"28" : T.surface2,
                cursor:loading ? "wait" : "pointer",
                fontSize:14, display:"flex", alignItems:"center", justifyContent:"center",
                color: hasNote ? c.color : T.textDim,
                boxShadow: hasNote ? `0 0 0 2px ${c.color}30` : "none",
                transition:"all 0.25s",
              }}
            >
              {loading ? <Spinner color={c.color}/> : hasNote ? (expanded?"▲":"▼") : agent?.avatar}
            </button>
            {hasNote && (
              <button onClick={clearNote} style={{ fontSize:8,color:T.textDim,background:"none",border:"none",cursor:"pointer",lineHeight:1 }}>✕</button>
            )}
          </div>
        )}
        
        {/* Archive btn - only show for completed items */}
        {item.done && onArchive && (
          <div style={{ display:"flex", flexDirection:"column", gap:4, flexShrink:0, alignItems:"center" }}>
            <button
              onClick={() => onArchive(item)}
              title="归档"
              style={{
                width:28, height:28, borderRadius:"50%", border:"none",
                background: T.surface2,
                cursor:"pointer",
                fontSize:14, display:"flex", alignItems:"center", justifyContent:"center",
                color: T.textDim,
                boxShadow: `0 0 0 2px ${T.border2}`,
                transition:"all 0.25s",
              }}
            >
              📦
            </button>
          </div>
        )}
      </div>

      {/* Agent note bubble */}
      {hasNote && expanded && (
        <div style={{
          background: dark_or_light(T, c.color+"12", c.color+"07"),
          border:`1px solid ${c.color}30`,
          borderTop:`1px dashed ${c.color}30`,
          borderRadius:"0 0 10px 10px",
          padding:"11px 14px 12px 38px",
          animation:"noteIn 0.2s ease",
          position:"relative",
        }}>
          {/* Agent avatar */}
          <div style={{
            position:"absolute", left:12, top:12,
            width:20, height:20, borderRadius:"50%",
            background:c.color+"25", border:`1px solid ${c.color}40`,
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:11,
          }}>{agent?.avatar}</div>

          {/* Header */}
          <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:7 }}>
            <span style={{ fontSize:10, color:c.color, fontWeight:600 }}>{item.agentNote.agentName}</span>
            {item.agentNote.greeting && (
              <span style={{ fontSize:10, color:T.textDim }}>· {item.agentNote.greeting}</span>
            )}
            <span style={{ fontSize:9, color:T.textDim, marginLeft:"auto" }}>{item.agentNote.ts}</span>
          </div>

          {/* Typewriter text */}
          <div style={{ fontSize:12.5, color:T.textMuted, lineHeight:1.85, whiteSpace:"pre-wrap" }}>
            {displayed || item.agentNote.text}
            {typing && <span style={{ opacity:0.5, animation:"pulse 0.8s ease infinite" }}>▌</span>}
          </div>

          {/* 查出处按钮 - 仅在 read 类目时显示 */}
          {item.cat === "read" && hasNote && expanded && (
            <div style={{ marginTop:8, display:"flex", justifyContent:"flex-end" }}>
              <button
                onClick={handleCheckSource}
                disabled={bookInfoLoading}
                style={{
                  padding:"6px 10px", borderRadius:16,
                  background: bookInfo ? T.surface : T.accent,
                  border:`1px solid ${T.border}`,
                  cursor: bookInfoLoading ? "wait" : "pointer",
                  fontSize:10, color: bookInfo ? T.textMuted : "#000",
                  fontFamily:"inherit",
                }}
              >
                {bookInfoLoading ? "查询中..." : bookInfo ? "已查询" : "查出处"}
              </button>
            </div>
          )}

          {/* 书摘信息卡片 - 仅在 read 类目时显示 */}
          {item.cat === "read" && bookInfo && expanded && (
            <div style={{
              marginTop:8, padding:"12px 14px", borderRadius:10,
              background: T.surface, border:`1px solid ${T.border}`,
              boxShadow: `0 2px 8px ${T.border}20`,
              fontSize:11, color:T.textMuted, lineHeight:1.6,
            }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
                <div style={{ width:24, height:24, borderRadius:"50%", background:T.accent+"20", border:`1px solid ${T.accent}40`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12 }}>📚</div>
                <div style={{ fontSize:10, color:T.textDim, fontWeight:600, letterSpacing:0.5 }}>书摘信息</div>
              </div>
              {bookInfo.message ? (
                <div style={{ fontSize:11, color:T.textDim }}>{bookInfo.message}</div>
              ) : (
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"6px 12px" }}>
                  {bookInfo.bookTitle && (
                    <div style={{ display:"flex", alignItems:"flex-start", gap:6 }}>
                      <span style={{ fontSize:10, color:T.textDim, minWidth:36 }}>书名</span>
                      <span style={{ color:T.text }}>{bookInfo.bookTitle}</span>
                    </div>
                  )}
                  {bookInfo.author && (
                    <div style={{ display:"flex", alignItems:"flex-start", gap:6 }}>
                      <span style={{ fontSize:10, color:T.textDim, minWidth:36 }}>作者</span>
                      <span style={{ color:T.text }}>{bookInfo.author}</span>
                    </div>
                  )}
                  {bookInfo.year && (
                    <div style={{ display:"flex", alignItems:"flex-start", gap:6 }}>
                      <span style={{ fontSize:10, color:T.textDim, minWidth:36 }}>年份</span>
                      <span style={{ color:T.text }}>{bookInfo.year}</span>
                    </div>
                  )}
                  {bookInfo.chapter && (
                    <div style={{ display:"flex", alignItems:"flex-start", gap:6 }}>
                      <span style={{ fontSize:10, color:T.textDim, minWidth:36 }}>章节</span>
                      <span style={{ color:T.text }}>{bookInfo.chapter}</span>
                    </div>
                  )}
                  {bookInfo.coreIdea && (
                    <div style={{ gridColumn:"1 / -1", display:"flex", alignItems:"flex-start", gap:6 }}>
                      <span style={{ fontSize:10, color:T.textDim, minWidth:36 }}>观点</span>
                      <span style={{ color:T.text, fontStyle:"italic" }}>{bookInfo.coreIdea}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 导航按钮 - 所有类目都显示 */}
          {expanded && (
            <div style={{ marginTop:8, display:"flex", justifyContent:"flex-end" }}>
              <button
                onClick={handleNavigate}
                style={{
                  padding:"6px 10px", borderRadius:16,
                  background: T.surface,
                  border:`1px solid ${T.border}`,
                  cursor:"pointer",
                  fontSize:10, color: T.textDim,
                  fontFamily:"inherit",
                  display:"flex", alignItems:"center", gap:6,
                }}
              >
                📍 导航
              </button>
            </div>
          )}

          {/* 链接摘要按钮 - 检测到 URL 时显示 */}
          {expanded && item.text.match(/https?:\/\/[^\s]+/) && (
            <div style={{ marginTop:8, display:"flex", justifyContent:"flex-end" }}>
              <button
                onClick={handleGetSummary}
                disabled={linkSummaryLoading}
                title={aiConfig.modelId.includes("glm") ? "获取链接摘要" : "当前模型不支持联网，请切换到 GLM"}
                style={{
                  padding:"6px 10px", borderRadius:16,
                  background: linkSummary ? T.surface : (aiConfig.modelId.includes("glm") ? T.accent : T.surface2),
                  border:`1px solid ${T.border}`,
                  cursor: linkSummaryLoading ? "wait" : (aiConfig.modelId.includes("glm") ? "pointer" : "not-allowed"),
                  fontSize:10, color: linkSummary ? T.textMuted : (aiConfig.modelId.includes("glm") ? "#000" : T.textDim),
                  fontFamily:"inherit",
                  display:"flex", alignItems:"center", gap:6,
                }}
              >
                {linkSummaryLoading ? <Spinner color={T.accent} size={12} /> : "🔗 获取摘要"}
              </button>
            </div>
          )}

          {/* 链接摘要卡片 */}
          {linkSummary && expanded && (
            <div style={{
              marginTop:8, padding:"12px 14px", borderRadius:10,
              background: T.surface, border:`1px solid ${T.border}`,
              boxShadow: `0 2px 8px ${T.border}20`,
              fontSize:11, color:T.textMuted, lineHeight:1.6,
            }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
                <div style={{ width:24, height:24, borderRadius:"50%", background:T.accent+"20", border:`1px solid ${T.accent}40`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12 }}>🔗</div>
                <div style={{ fontSize:10, color:T.textDim, fontWeight:600, letterSpacing:0.5 }}>链接摘要</div>
                <span style={{ fontSize:9, color:linkSummary.verified ? T.accent : "#CC4444", border:`1px solid ${linkSummary.verified ? T.accent : "#CC4444"}30`, padding:"1px 4px", borderRadius:3, marginLeft:"auto" }}>
                  {linkSummary.verified ? "📡 已验证" : "⚠️ 仅供参考"}
                </span>
              </div>
              {linkSummary.topic && (
                <div style={{ fontSize:12, color:T.text, fontWeight:600, marginBottom:6 }}>
                  📌 {linkSummary.topic}
                </div>
              )}
              {linkSummary.points && linkSummary.points.length > 0 && (
                <div style={{ marginBottom:6 }}>
                  {linkSummary.points.map((point, index) => (
                    <div key={index} style={{ fontSize:11, color:T.text, marginBottom:2 }}>
                      · {point}
                    </div>
                  ))}
                </div>
              )}
              {linkSummary.value && (
                <div style={{ fontSize:10, color:T.textDim, fontStyle:"italic" }}>
                  💡 {linkSummary.value}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function dark_or_light(T, darkVal, lightVal) {
  return T.bg.startsWith("#08") ? darkVal : lightVal;
}