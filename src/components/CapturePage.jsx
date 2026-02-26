import { useState } from 'react';
import { Pill, ModeBtn, SectionLabel } from './shared/index.jsx';
import { useCats } from '../store/useItems.js';
import { useArchive } from '../hooks/useStorage.js';
import ItemCard from './ItemCard.jsx';

export default function CapturePage({ items, toggleDone, setAgentNote, T, aiConfig, onRemove }) {
  const [filter, setFilter] = useState("all");
  const [autoMode, setAutoMode] = useState(false);
  const [query, setQuery] = useState("");
  const [cats] = useCats();
  const { addArchive } = useArchive();
  const filtered  = filter==="all" ? items : items.filter(i=>i.cat===filter);
  const pending   = filtered.filter(i=>!i.done);
  const doneItems = filtered.filter(i=>i.done);

  return (
    <div>
      {/* Search */}
      <div style={{ marginBottom:10 }}>
        <input
          value={query}
          onChange={e=>setQuery(e.target.value)}
          placeholder="搜索…"
          style={{
            width:"100%", background:T.surface2, border:`1px solid ${T.border2}`,
            borderRadius:8, padding:"10px 12px", color:T.text, fontSize:13,
            fontFamily:"inherit", outline:"none",
          }}
        />
      </div>

      {/* Agent mode toggle */}
      <div style={{
        display:"flex", alignItems:"center", justifyContent:"space-between",
        marginBottom:10, padding:"8px 12px",
        background:T.surface, border:`1px solid ${T.border}`, borderRadius:10,
      }}>
        <div style={{ fontSize:11, color:T.textMuted }}>
          <span style={{ marginRight:6 }}>🤖</span>Agent 模式
        </div>
        <div style={{ display:"flex", gap:6 }}>
          <ModeBtn active={autoMode} onClick={()=>setAutoMode(true)} color={T.accent} T={T}>自动</ModeBtn>
          <ModeBtn active={!autoMode} onClick={()=>setAutoMode(false)} color={T.accent} T={T}>按需</ModeBtn>
        </div>
      </div>

      {/* Category filter */}
      <div style={{ display:"flex", gap:6, overflowX:"auto", paddingBottom:6, marginBottom:12 }}>
        <Pill active={filter==="all"} color={T.accent} T={T} onClick={()=>setFilter("all")}>全部</Pill>
        {cats.map(c=><Pill key={c.id} active={filter===c.id} color={c.color} T={T} onClick={()=>setFilter(c.id)}>{c.icon}</Pill>)}
      </div>

      {pending.length>0 && (
        <>
          <SectionLabel T={T}>未完成 · {pending.length}</SectionLabel>
          {pending.map(i=><ItemCard key={i.id} item={i} onToggle={toggleDone} onNote={setAgentNote} autoMode={autoMode} T={T} aiConfig={aiConfig}/>)}
        </>
      )}
      {doneItems.length>0 && (
        <>
          <SectionLabel T={T} style={{marginTop:16}}>已完成 · {doneItems.length}</SectionLabel>
          {doneItems.map(i=><ItemCard key={i.id} item={i} onToggle={toggleDone} onNote={setAgentNote} autoMode={autoMode} T={T} aiConfig={aiConfig} onArchive={(item) => { 
            addArchive(item); 
            onRemove(item.id); 
          }}/>)} 
        </>
      )}
    </div>
  );
}

