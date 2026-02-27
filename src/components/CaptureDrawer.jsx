import { useState, useRef, useEffect } from 'react';
import { Pill } from './shared/index.jsx';
import { useCats } from '../store/useItems.js';
import { parseDateFromText } from '../utils/dateUtils.js';
import { useSpeech } from '../hooks/useSpeech.js';

export default function CaptureDrawer({ onClose, onAdd, T }) {
  const [text,setText]       = useState("");
  const [selCat,setSelCat]   = useState("spark");
  const [priority,setPriority] = useState("中");
  const [deadline,setDeadline] = useState("");
  const [timeHint,setTimeHint] = useState("");
  const [cats] = useCats();
  const ref=useRef(null);
  useEffect(()=>{ ref.current?.focus(); },[]);
  
  // 语音输入
  const { listening, transcript, start, stop, supported } = useSpeech();
  
  // 实时更新输入框
  useEffect(()=>{
    setText(transcript);
  }, [transcript]);
  
  // 实时识别时间
  useEffect(()=>{
    const res = parseDateFromText(text);
    if (res.hasTime) {
      setTimeHint(`📅 已识别：${res.deadline}`);
      setDeadline(res.deadline);
    } else {
      setTimeHint("");
      setDeadline("");
    }
  }, [text]);

  
  const submit=()=>{ if(!text.trim()) return; onAdd({cat:selCat,text:text.trim(),priority,deadline}); onClose(); };
  return (
    <div style={{ position:"fixed",inset:0,zIndex:200,display:"flex",flexDirection:"column",justifyContent:"flex-end" }}>
      <div onClick={onClose} style={{ position:"absolute",inset:0,background:"rgba(0,0,0,0.6)",backdropFilter:"blur(4px)" }}/>
      <div style={{ position:"relative",background:T.surface,borderTop:`1px solid ${T.border}`,borderRadius:"16px 16px 0 0",padding:"20px 20px 36px",animation:"slideUp 0.3s ease" }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16 }}>
          <div style={{ fontSize:10,letterSpacing:4,color:T.textDim }}>快速捕获</div>
          <button onClick={onClose} style={{ background:"none",border:"none",color:T.textDim,fontSize:18,cursor:"pointer" }}>✕</button>
        </div>
        <div style={{ position:"relative" }}>
          <textarea ref={ref} value={text} onChange={e=>setText(e.target.value)}
            placeholder="任何想法、任务、资讯…"
            onKeyDown={e=>{ if(e.key==="Enter"&&(e.metaKey||e.ctrlKey)) submit(); }}
            style={{ width:"100%",background:T.surface2,border:`1px solid ${T.border2}`,borderRadius:10,padding:"12px 14px",color:T.text,fontSize:14,resize:"none",height:88,fontFamily:"inherit",outline:"none",lineHeight:1.6 }}
          />
          <button
            onClick={supported ? (listening ? stop : start) : undefined}
            disabled={!supported}
            title={supported ? (listening ? "停止录音" : "开始录音") : "当前浏览器不支持语音输入"}
            style={{
              position:"absolute", right:8, bottom:8,
              width:32, height:32, borderRadius:"50%",
              border:"none", cursor:supported ? "pointer" : "not-allowed",
              background:listening ? "#E53935" : (supported ? T.surface2 : T.border2),
              color:listening ? "#FFF" : T.textDim,
              fontSize:16, display:"flex", alignItems:"center", justifyContent:"center",
              boxShadow: listening ? "0 0 0 3px #E5393530" : "none",
              transition:"all 0.2s",
            }}
          >
            🎤
          </button>
        </div>
        <div style={{ display:"flex",gap:6,marginTop:12,flexWrap:"wrap" }}>
          {cats.map(c=><Pill key={c.id} active={selCat===c.id} color={c.color} T={T} onClick={()=>setSelCat(c.id)}>{c.icon} {c.label}</Pill>)}
        </div>
        <div style={{ display:"flex",gap:8,marginTop:10,alignItems:"center" }}>
          {["高","中","低"].map(p=>(
            <button key={p} onClick={()=>setPriority(p)} style={{ padding:"4px 12px",borderRadius:16,cursor:"pointer",background:priority===p?T.accent+"22":"transparent",border:`1px solid ${priority===p?T.accent:T.border2}`,color:priority===p?T.accent:T.textMuted,fontSize:11,fontFamily:"inherit" }}>{p}</button>
          ))}
          <input type="date" value={deadline} onChange={e=>setDeadline(e.target.value)}
            style={{ flex:1,background:T.surface2,border:`1px solid ${T.border2}`,borderRadius:6,padding:"4px 8px",color:T.textMuted,fontSize:11,fontFamily:"inherit",outline:"none" }}
          />
        </div>
        {timeHint && (
          <div style={{ fontSize:11, color:T.textDim, marginTop:6, animation:"noteIn 0.3s ease" }}>
            {timeHint}
          </div>
        )}
        
        <button onClick={submit} style={{ width:"100%",marginTop:14,padding:"12px",background:T.accent,color:"#000",border:"none",borderRadius:10,fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"inherit" }}>记录 ⌘↵</button>
      </div>
    </div>
  );
}

