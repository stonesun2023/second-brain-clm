import { useState, useEffect, useCallback, useRef } from 'react'
import { DARK, LIGHT } from './styles/theme.js'
import { MODEL_KEY, APIKEY_PRE, STORAGE_KEY, THEME_KEY } from './utils/data.js'
import { MODELS } from './utils/ai.js'
import { useItems, useTheme } from './hooks/useStorage.js'
import CapturePage from './components/CapturePage.jsx'
import BoardPage from './components/BoardPage.jsx'
import InsightPage from './components/InsightPage.jsx'
import CaptureDrawer from './components/CaptureDrawer.jsx'
import SettingsPanel from './components/SettingsPanel.jsx'
import RingProgress from './components/shared/RingProgress.jsx'
import { parseDateFromText } from './utils/dateUtils.js'

export default function App() {
  const [items, setItems]         = useItems();
  const [page,  setPage]          = useState(1);
  const [dark,  setDark]          = useTheme();
  const [showCapture, setShowCapture] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [storageReady, setStorageReady] = useState(false);
  const [modelId, setModelId]     = useState("claude-sonnet");
  const [apiKeys, setApiKeys]     = useState({}); // { modelId: key }
  const T = dark ? DARK : LIGHT;

  const touchX   = useRef(null);
  const dragging = useRef(false);
  const [dragDx, setDragDx] = useState(0);

  // Load from storage on mount
  useEffect(() => {
    (async () => {
      const [savedItems, savedDark, savedModel] = await Promise.all([
        loadFromStorage(), loadTheme(), loadModelConfig()
      ]);
      if (savedItems) setItems(savedItems);
      setDark(savedDark);
      setModelId(savedModel);
      // Load API keys for all models
      const keys = {};
      for (const m of MODELS) {
        keys[m.id] = await loadApiKey(m.id);
      }
      setApiKeys(keys);
      setStorageReady(true);
      // 时间测试
      console.log('时间测试:', parseDateFromText("明天下午3点开会"));
    })();
  }, []);

  // Save items whenever they change (after initial load)
  useEffect(() => {
    if (storageReady) saveToStorage(items);
  }, [items, storageReady]);

  const toggleDark = () => {
    const next = !dark;
    setDark(next);
    saveTheme(next);
  };

  const handleModelChange = (id) => {
    setModelId(id);
    saveModelConfig(id);
  };

  const handleApiKeyChange = (id, key) => {
    setApiKeys(prev => ({...prev, [id]: key}));
    saveApiKey(id, key);
  };

  // Build AI config object to pass to children
  const aiConfig = { modelId, apiKey: apiKeys[modelId] || "" };

  const done   = items.filter(i=>i.done);
  const pct    = items.length ? Math.round(done.length/items.length*100) : 0;
  const urgent = items.filter(i=>i.deadline&&!i.done);

  const onTouchStart = (e) => { touchX.current=e.touches[0].clientX; dragging.current=true; setDragDx(0); };
  const onTouchMove  = (e) => { if(!dragging.current) return; setDragDx(e.touches[0].clientX-touchX.current); };
  const onTouchEnd   = () => {
    dragging.current=false;
    if(dragDx<-60&&page<2) setPage(p=>p+1);
    if(dragDx>60&&page>0)  setPage(p=>p-1);
    setDragDx(0);
  };

  const toggleDone = (id) => setItems(prev=>prev.map(i=>i.id===id?{...i,done:!i.done}:i));
  const setAgentNote = (id, note) => setItems(prev=>prev.map(i=>i.id===id?{...i,agentNote:note}:i));

  const addItem = (data) => {
    const newItem = {
      id:Date.now(), done:false,
      time:new Date().toTimeString().slice(0,5),
      agentNote:null,
      ...data
    };
    setItems(prev=>[newItem,...prev]);
    return newItem;
  };

  const resetData = async () => {
    if(!window.confirm("重置所有数据？")) return;
    setItems(INIT_ITEMS);
    try { await window.storage.delete(STORAGE_KEY); } catch(e){}
  };

  const currentModel = MODELS.find(m=>m.id===modelId) || MODELS[0];

  return (
    <div style={{
      maxWidth:480, margin:"0 auto", minHeight:"100vh",
      background:T.bg, color:T.text,
      fontFamily:"'Noto Serif SC','Georgia',serif",
      display:"flex", flexDirection:"column",
      overflow:"hidden", position:"relative", userSelect:"none",
      transition:"background 0.3s,color 0.3s",
    }}>
      {/* HEADER */}
      <header style={{ padding:"18px 20px 0", flexShrink:0, position:"relative", zIndex:20 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div>
            <div style={{ fontSize:10, letterSpacing:4, color:T.textDim, marginBottom:3 }}>SECOND BRAIN · CLM 2.0</div>
            <div style={{ fontSize:19, fontWeight:700, letterSpacing:-0.5 }}>
              {new Date().toLocaleDateString("zh-CN",{month:"long",day:"numeric",weekday:"long"})}
            </div>
          </div>
          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
            {/* Model badge — click to open settings */}
            <button onClick={()=>setShowSettings(true)} title="AI模型设置" style={{
              display:"flex", alignItems:"center", gap:5,
              padding:"4px 10px", borderRadius:16,
              background: T.surface, border:`1px solid ${T.border}`,
              cursor:"pointer", fontSize:10, color:T.textMuted,
              fontFamily:"inherit",
            }}>
              <span style={{ fontSize:9 }}>🤖</span>
              <span>{currentModel.label}</span>
            </button>
            <button onClick={toggleDark} title="切换主题" style={{
              width:36, height:20, borderRadius:10,
              background:dark?"#2A2A3A":"#DDD",
              border:"none", cursor:"pointer", position:"relative", transition:"background 0.3s",
            }}>
              <div style={{
                position:"absolute", top:3, left:dark?18:3,
                width:14, height:14, borderRadius:"50%",
                background:dark?"#F5C518":"#FFF",
                transition:"left 0.3s", fontSize:8,
                display:"flex", alignItems:"center", justifyContent:"center",
              }}>{dark?"🌙":"☀️"}</div>
            </button>
            <RingProgress pct={pct} T={T}/>
          </div>
        </div>

        {/* Storage indicator */}
        <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:8 }}>
          <div style={{ width:5, height:5, borderRadius:"50%", background:storageReady?"#3A8A5A":"#888", transition:"background 0.5s" }}/>
          <span style={{ fontSize:9, color:T.textDim, letterSpacing:1 }}>
            {storageReady ? `数据已同步 · ${items.length}条记录` : "同步中…"}
          </span>
          <button onClick={resetData} style={{ marginLeft:"auto", fontSize:8, color:T.textDim, background:"none", border:"none", cursor:"pointer", letterSpacing:1 }}>重置</button>
        </div>

        {/* Page dots */}
        <div style={{ display:"flex", justifyContent:"center", gap:8, marginTop:10, marginBottom:2 }}>
          {["捕获","看板","复盘"].map((lbl,i)=>(
            <button key={i} onClick={()=>setPage(i)} style={{
              background:"none", border:"none", cursor:"pointer",
              display:"flex", flexDirection:"column", alignItems:"center", gap:4, padding:"4px 8px",
            }}>
              <div style={{ width:page===i?24:6, height:4, borderRadius:2, background:page===i?T.accent:T.border, transition:"all 0.3s" }}/>
              <div style={{ fontSize:9, letterSpacing:2, color:page===i?T.accent:T.textDim, transition:"color 0.3s" }}>{lbl}</div>
            </button>
          ))}
        </div>
      </header>

      {/* SWIPE */}
      <div
        onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
        style={{ flex:1, overflow:"hidden", position:"relative" }}
      >
        <div style={{
          display:"flex", width:"300%", height:"100%",
          transform:`translateX(calc(${-page*(100/3)}% + ${dragDx/3}px))`,
          transition:dragging.current?"none":"transform 0.38s cubic-bezier(.25,.8,.25,1)",
        }}>
          {[
            <CapturePage key="c" items={items} toggleDone={toggleDone} setAgentNote={setAgentNote} T={T} aiConfig={aiConfig}/>,
            <BoardPage   key="b" items={items} week={WEEK} pct={pct} urgent={urgent} T={T}/>,
            <InsightPage key="i" items={items} done={done} pct={pct} T={T} aiConfig={aiConfig}/>,
          ].map((p,i)=>(
            <div key={i} style={{ width:`${100/3}%`, height:"100%", overflowY:"auto", padding:"10px 20px 120px", flexShrink:0 }}>
              {p}
            </div>
          ))}
        </div>
      </div>

      <button onClick={()=>setShowCapture(true)} style={{
        position:"fixed", bottom:20, right:"calc(50% - 220px)",
        width:50, height:50, borderRadius:"50%",
        background:T.accent, color:"#000", border:"none",
        fontSize:24, cursor:"pointer", zIndex:100,
        boxShadow:`0 4px 24px ${T.accent}55`,
        display:"flex", alignItems:"center", justifyContent:"center",
      }}>+</button>

      {showCapture && <CaptureDrawer onClose={()=>setShowCapture(false)} onAdd={addItem} T={T}/>}
      {showSettings && (
        <SettingsPanel
          T={T}
          modelId={modelId}
          apiKeys={apiKeys}
          onModelChange={handleModelChange}
          onApiKeyChange={handleApiKeyChange}
          onClose={()=>setShowSettings(false)}
        />
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;600;700&display=swap');
        *{box-sizing:border-box;} ::-webkit-scrollbar{width:0;}
        @keyframes fadeUp{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}}
        @keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes pulse{0%,100%{opacity:0.5}50%{opacity:1}}
        @keyframes popIn{from{opacity:0;transform:scale(0.96)}to{opacity:1;transform:scale(1)}}
        @keyframes noteIn{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}
      `}</style>
    </div>
  );
}

// ─── STORAGE UTILS ─────────────────────────────────────────────────────────────
async function loadFromStorage() {
  try {
    const r = await window.storage.get(STORAGE_KEY);
    if (r && r.value) return JSON.parse(r.value);
  } catch(e) {}
  return null;
}
async function saveToStorage(items) {
  try {
    await window.storage.set(STORAGE_KEY, JSON.stringify(items));
  } catch(e) {}
}
async function loadTheme() {
  try {
    const r = await window.storage.get(THEME_KEY);
    if (r) return r.value !== "light"; // return isDark
  } catch(e) {}
  return false; // default LIGHT
}
async function saveTheme(isDark) {
  try {
    await window.storage.set(THEME_KEY, isDark ? "dark" : "light");
  } catch(e) {}
}
async function loadModelConfig() {
  try {
    const r = await window.storage.get(MODEL_KEY);
    return r ? r.value : "claude-sonnet";
  } catch(e) { return "claude-sonnet"; }
}
async function saveModelConfig(id) {
  try { await window.storage.set(MODEL_KEY, id); } catch(e) {}
}
async function loadApiKey(modelId) {
  try {
    const r = await window.storage.get(APIKEY_PRE + modelId);
    return r ? r.value : "";
  } catch(e) { return ""; }
}
async function saveApiKey(modelId, key) {
  try { await window.storage.set(APIKEY_PRE + modelId, key); } catch(e) {}
}

// ─── INIT DATA ─────────────────────────────────────────────────────────────────
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

const WEEK = [
  { day:"周一", label:"2/23", tasks:4, done:4 },
  { day:"周二", label:"2/24", tasks:5, done:5 },
  { day:"周三", label:"2/25", tasks:3, done:2 },
  { day:"周四", label:"2/26", tasks:6, done:3, today:true },
  { day:"周五", label:"2/27", tasks:4, done:0 },
  { day:"周六", label:"2/28", tasks:2, done:0 },
  { day:"周日", label:"3/1",  tasks:1, done:0 },
];