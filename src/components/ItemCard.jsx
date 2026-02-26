import { useState, useRef, useCallback, useEffect } from 'react';
import { AGENTS } from '../utils/agents.js';
import { callAI } from '../utils/ai.js';
import { Spinner } from './shared/index.jsx';
import { useCats } from '../store/useItems.js';
import { catInfo } from '../utils/data.js';

// ─── ITEM CARD with Agent ─────────────────────────────────────────────────────
export default function ItemCard({ item, onToggle, onNote, autoMode, T, aiConfig, onArchive }) {
  const [loading, setLoading]     = useState(false);
  const [expanded, setExpanded]   = useState(false);
  const [displayed, setDisplayed] = useState(""); // typewriter text
  const [typing, setTyping]       = useState(false);
  const c     = catInfo(item.cat);
  const agent = AGENTS[item.cat] || { name: "未知", avatar: "❓", greeting: "", system: "" };
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

  const hasNote = !!item.agentNote;

  return (
    <div style={{ marginBottom:8 }}>
      {/* Main row */}
      <div style={{
        display:"flex", gap:10, padding:"10px 12px",
        background:T.surface,
        borderLeft:`3px solid ${item.done ? "transparent" : c.color}`,
        borderRadius: hasNote && expanded ? "8px 8px 0 0" : 8,
        border:`1px solid ${T.border}`,
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
        </div>
      )}
    </div>
  );
}

function dark_or_light(T, darkVal, lightVal) {
  return T.bg.startsWith("#08") ? darkVal : lightVal;
}