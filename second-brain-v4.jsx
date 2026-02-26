import { useState, useRef, useEffect, useCallback } from "react";

// ─── THEME ───────────────────────────────────────────────────────────────────
const DARK = {
  bg:"#080809", surface:"#0D0D12", surface2:"#111118",
  border:"#1A1A24", border2:"#222",
  text:"#E0DDD5", textMuted:"#7A7A8A", textDim:"#3A3A44",
  accent:"#F5C518", pill:"#F5C51815",
};
const LIGHT = {
  bg:"#F4F2EE", surface:"#FFFFFF", surface2:"#F0EEE8",
  border:"#E0DDD5", border2:"#DDD",
  text:"#1A1A1E", textMuted:"#555060", textDim:"#AAAAAA",
  accent:"#B8860B", pill:"#B8860B15",
};

// ─── AGENTS ──────────────────────────────────────────────────────────────────
const AGENTS = {
  spark: {
    name:"灵感伙伴", icon:"⚡", color:"#D4920A",
    avatar:"💡",
    greeting:"哦这个有意思！",
    system:`你是用户最懂他的朋友，专门帮他抓住转瞬即逝的好想法。说话像发微信，不像写报告。

你看到用户记录了一个灵感后，要做三件事：
1. 先用一句话说出你第一反应觉得这个想法妙在哪（要真诚，不要客套）
2. 问他一个能让这个想法"活起来"的问题，用"→ 对了，"开头，要像朋友追问那种感觉
3. 帮他想一个今天就能做的最小行动，用"▶ 现在可以"开头，具体到能立刻执行

注意：语气要自然，说人话，80字以内，不用分条列点，直接连着说。`,
  },
  task: {
    name:"任务搭档", icon:"◎", color:"#3A8A5A",
    avatar:"⚙️",
    greeting:"收到，帮你拆一下——",
    system:`你是用户的实干派朋友，帮他把任务说清楚、搞定它。说话直接，不废话。

看到任务后，你要：
1. 估个大概时间，用"⏱ 大概要"开头，给个范围就好
2. 点出最容易卡壳的地方，用"⚠ 小心"开头，说具体风险不说套话
3. 告诉他第一步怎么动，用"▶ 先"开头，越具体越好，让他5秒内能开始

口语化，像帮朋友出主意，80字以内。`,
  },
  news: {
    name:"资讯雷达", icon:"📡", color:"#2A7AAA",
    avatar:"🔭",
    greeting:"这条信息值得注意——",
    system:`你是用户信任的消息灵通朋友，帮他过滤噪音、抓住真正重要的东西。

看到一条资讯后：
1. 用一句话说这事对他影响最大的点，用"📌 关键是"开头，说本质不说表面
2. 帮他想想这跟他自己的工作生活有没有关系，用"→ 跟你有关的是"开头
3. 建议他接下来怎么对待这条信息，用"▶ 建议"开头，是关注、行动还是忽略

直接说重点，80字以内，不用太正式。`,
  },
  read: {
    name:"读书搭子", icon:"◈", color:"#7A4AAA",
    avatar:"📚",
    greeting:"这段读到有意思了——",
    system:`你是用户的读书好友，喜欢一起聊书里的东西，帮他把读到的东西真正消化掉。

看到他的读书记录后：
1. 说出你觉得这段内容最值钱的那个点，用"💎 这里说的其实是"开头，要说得有点深度
2. 问他一个能让他想好久的问题，用"→ 你有没有想过"开头，问题要能触动他
3. 帮他把这个知识跟实际生活挂上钩，用"▶ 可以用在"开头，说具体场景

像两个人在咖啡馆聊书，80字以内。`,
  },
  photo: {
    name:"摄影搭档", icon:"◉", color:"#C06A30",
    avatar:"📷",
    greeting:"这个拍摄想法不错——",
    system:`你是用户的摄影朋友，一起聊创作的那种，懂技术也懂审美，说话接地气。

看到他的摄影想法或计划后：
1. 说出你觉得这个想法最有意思的创作点，用"🎯 这个场景"开头，要说出为什么有意思
2. 给一个具体的技术或构图建议，用"→ 拍的时候"开头，越具体越好
3. 提醒他最容易忘的那个细节，用"▶ 别忘了"开头，是实战经验那种提醒

像在现场跟他一起拍，说人话，80字以内。`,
  },
};

const SUMMARY_AGENT = {
  name:"全局观察者", icon:"🔄", color:"#888",
  system:`你是用户一个特别了解他的朋友，能从他记录的所有内容里看出他自己没注意到的规律。说话像聊天，不像分析报告。

看完他的所有记录后，聊三件事：
### 🔍 我注意到
（说你发现的一个有意思的规律或矛盾，要具体，像"你最近记的灵感好多都跟XX有关"这种）
### ⚡ 这几个可以连起来
（找出可以互相促进的灵感+任务+资讯，说清楚怎么联动）
### 🎯 如果我是你
（给一个最值得这周集中做的事，说出你的理由）
总共150字以内，口语化。`,
};

// ─── MODEL ADAPTER ───────────────────────────────────────────────────────────
// Supported models with their API configs
const MODELS = [
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

const MODEL_KEY  = "sb-model-v4";
const APIKEY_PRE = "sb-apikey-v4-"; // + model.id

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

// Universal AI call — handles all providers transparently
async function callAI({ modelId, apiKey, system, userContent, maxTokens = 400 }) {
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

// ─── DATA ────────────────────────────────────────────────────────────────────
const CATS = [
  { id:"spark", label:"灵感", icon:"⚡", color:"#D4920A" },
  { id:"task",  label:"任务", icon:"◎",  color:"#3A8A5A" },
  { id:"news",  label:"资讯", icon:"📡", color:"#2A7AAA" },
  { id:"read",  label:"读书", icon:"◈",  color:"#7A4AAA" },
  { id:"photo", label:"摄影", icon:"◉",  color:"#C06A30" },
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

const catInfo = (id) => CATS.find(c=>c.id===id) || { color:"#888", icon:"·", label:id };

// ─── STORAGE ─────────────────────────────────────────────────────────────────
const STORAGE_KEY = "sb-items-v4";
const THEME_KEY   = "sb-theme-v4";

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

// ─── MAIN ────────────────────────────────────────────────────────────────────
export default function App() {
  const [items, setItems]         = useState(INIT_ITEMS);
  const [page,  setPage]          = useState(1);
  const [dark,  setDark]          = useState(false); // default light
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

// ─── CAPTURE PAGE ─────────────────────────────────────────────────────────────
function CapturePage({ items, toggleDone, setAgentNote, T, aiConfig }) {
  const [filter, setFilter] = useState("all");
  const [autoMode, setAutoMode] = useState(false);
  const filtered  = filter==="all" ? items : items.filter(i=>i.cat===filter);
  const pending   = filtered.filter(i=>!i.done);
  const doneItems = filtered.filter(i=>i.done);

  return (
    <div>
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
        {CATS.map(c=><Pill key={c.id} active={filter===c.id} color={c.color} T={T} onClick={()=>setFilter(c.id)}>{c.icon}</Pill>)}
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
          {doneItems.map(i=><ItemCard key={i.id} item={i} onToggle={toggleDone} onNote={setAgentNote} autoMode={autoMode} T={T} aiConfig={aiConfig}/>)}
        </>
      )}
    </div>
  );
}

// ─── ITEM CARD with Agent ─────────────────────────────────────────────────────
function ItemCard({ item, onToggle, onNote, autoMode, T, aiConfig }) {
  const [loading, setLoading]     = useState(false);
  const [expanded, setExpanded]   = useState(false);
  const [displayed, setDisplayed] = useState(""); // typewriter text
  const [typing, setTyping]       = useState(false);
  const c     = catInfo(item.cat);
  const agent = AGENTS[item.cat];
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

// ─── BOARD PAGE ───────────────────────────────────────────────────────────────
function BoardPage({ items, week, pct, urgent, T }) {
  const [boardTab, setBoardTab] = useState("week"); // week | month | matrix
  const todayIdx   = week.findIndex(d=>d.today);
  const agentCount = items.filter(i=>i.agentNote).length;
  const today      = new Date();

  return (
    <div>
      {/* ── Today snapshot bar ── */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:6, marginBottom:14 }}>
        {[
          {v:`${week[todayIdx]?.done}/${week[todayIdx]?.tasks}`, l:"今日完成", c:T.accent},
          {v:`${pct}%`,                                           l:"完成率",   c:"#3A8A5A"},
          {v:urgent.length,                                        l:"截止预警", c:urgent.length>0?"#CC4444":T.textDim},
          {v:agentCount,                                           l:"AI批注",  c:"#7A4AAA"},
        ].map(s=>(
          <div key={s.l} style={{ background:T.surface,border:`1px solid ${T.border}`,borderRadius:10,padding:"10px 8px",textAlign:"center" }}>
            <div style={{ fontSize:18,fontWeight:700,color:s.c,fontFamily:"monospace" }}>{s.v}</div>
            <div style={{ fontSize:8,color:T.textDim,marginTop:3 }}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* ── Tab switcher ── */}
      <div style={{ display:"flex", gap:0, marginBottom:14, background:T.surface2, borderRadius:10, padding:3 }}>
        {[["week","周视图"],["month","月视图"],["matrix","矩阵"]].map(([id,lbl])=>(
          <button key={id} onClick={()=>setBoardTab(id)} style={{
            flex:1, padding:"7px 0", borderRadius:8, border:"none",
            background:boardTab===id ? T.surface : "transparent",
            color:boardTab===id ? T.accent : T.textDim,
            fontSize:11, cursor:"pointer", fontFamily:"inherit",
            fontWeight:boardTab===id?600:400,
            boxShadow:boardTab===id?"0 1px 4px rgba(0,0,0,0.08)":"none",
            transition:"all 0.2s",
          }}>{lbl}</button>
        ))}
      </div>

      {/* ── WEEK VIEW ── */}
      {boardTab==="week" && <WeekView items={items} week={week} todayIdx={todayIdx} T={T}/>}

      {/* ── MONTH VIEW ── */}
      {boardTab==="month" && <MonthView items={items} today={today} T={T}/>}

      {/* ── MATRIX VIEW ── */}
      {boardTab==="matrix" && <MatrixView items={items} urgent={urgent} T={T}/>}
    </div>
  );
}

// ── WEEK VIEW ──────────────────────────────────────────────────────────────────
function WeekView({ items, week, todayIdx, T }) {
  const [selectedDay, setSelectedDay] = useState(todayIdx);

  // Map items to days by deadline or "today" label
  const getItemsForDay = (dayIdx) => {
    const d = week[dayIdx];
    // Use deadline matching for real items
    return items.filter(item => {
      if (!item.deadline) return dayIdx === todayIdx && !item.done;
      const dl = item.deadline; // "2026-02-26" format
      const dayDate = `2026-02-${parseInt(d.label.split("/")[1]).toString().padStart(2,"0")}`;
      return dl === dayDate || dl.endsWith(`-${d.label.split("/")[1].padStart(2,"0")}`);
    });
  };

  const selDay = week[selectedDay];
  const selItems = getItemsForDay(selectedDay);

  // Category color strip for a day
  const getDayCatColors = (dayIdx) => {
    const its = getItemsForDay(dayIdx);
    return [...new Set(its.map(i=>i.cat))].slice(0,3).map(c=>catInfo(c).color);
  };

  return (
    <div>
      {/* Week strip */}
      <div style={{ display:"flex", gap:5, marginBottom:14 }}>
        {week.map((d,i)=>{
          const ratio   = d.tasks ? d.done/d.tasks : 0;
          const isFuture= i > todayIdx;
          const isToday = d.today;
          const isSel   = i === selectedDay;
          const catCols = getDayCatColors(i);

          return (
            <div key={d.day}
              onClick={()=>setSelectedDay(i)}
              style={{
                flex:1, cursor:"pointer",
                display:"flex", flexDirection:"column", alignItems:"center", gap:4,
              }}
            >
              {/* Day label */}
              <div style={{ fontSize:9, color:isToday?T.accent:T.textDim, fontFamily:"monospace", fontWeight:isToday?700:400 }}>
                {d.day.slice(1)}
              </div>

              {/* Day block */}
              <div style={{
                width:"100%", paddingBottom:"100%", position:"relative", borderRadius:8,
                background: isFuture ? T.surface2
                  : ratio===1 ? "#3A8A5A22"
                  : ratio>0   ? "#D4920A18"
                  : T.surface,
                border:`2px solid ${isSel ? T.accent : isToday ? T.accent+"66" : T.border}`,
                transition:"all 0.2s",
                boxShadow: isSel ? `0 0 0 3px ${T.accent}22` : "none",
              }}>
                <div style={{ position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:3 }}>
                  {/* Completion donut */}
                  {!isFuture && d.tasks > 0 && (
                    <svg width="22" height="22" style={{ transform:"rotate(-90deg)" }}>
                      <circle cx="11" cy="11" r="8" fill="none" stroke={T.border} strokeWidth="2.5"/>
                      <circle cx="11" cy="11" r="8" fill="none"
                        stroke={ratio===1?"#3A8A5A":T.accent} strokeWidth="2.5"
                        strokeDasharray={`${2*Math.PI*8}`}
                        strokeDashoffset={`${2*Math.PI*8*(1-ratio)}`}
                        strokeLinecap="round"
                      />
                    </svg>
                  )}
                  {isFuture && <span style={{ fontSize:10, color:T.textDim }}>·</span>}
                  {/* Cat color dots */}
                  {catCols.length>0 && (
                    <div style={{ display:"flex",gap:2 }}>
                      {catCols.map((col,ci)=>(
                        <div key={ci} style={{ width:4,height:4,borderRadius:"50%",background:col }}/>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Date */}
              <div style={{ fontSize:8, color:T.textDim, fontFamily:"monospace" }}>{d.label}</div>
            </div>
          );
        })}
      </div>

      {/* Selected day detail */}
      <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:12, padding:"14px", marginBottom:14 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
          <div>
            <span style={{ fontSize:13, fontWeight:700, color:T.text }}>{selDay.day}</span>
            <span style={{ fontSize:10, color:T.textDim, marginLeft:8 }}>{selDay.label}</span>
            {selDay.today && <span style={{ fontSize:9,color:T.accent,marginLeft:6,border:`1px solid ${T.accent}`,padding:"1px 5px",borderRadius:4 }}>今天</span>}
          </div>
          <div style={{ fontSize:11, color:T.textDim, fontFamily:"monospace" }}>{selDay.done}/{selDay.tasks}</div>
        </div>

        {selItems.length > 0 ? (
          selItems.map(item=>(
            <div key={item.id} style={{
              display:"flex", gap:8, padding:"8px 10px", marginBottom:6,
              background:T.surface2, borderLeft:`3px solid ${catInfo(item.cat).color}`,
              borderRadius:6, alignItems:"flex-start",
            }}>
              <div style={{
                width:12, height:12, borderRadius:"50%", flexShrink:0, marginTop:2,
                border:`2px solid ${item.done?"#888":catInfo(item.cat).color}`,
                background:item.done?T.border:"transparent",
              }}/>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:12, color:item.done?T.textDim:T.text, textDecoration:item.done?"line-through":"none", lineHeight:1.4 }}>
                  {item.text}
                </div>
                <div style={{ display:"flex", gap:6, marginTop:3 }}>
                  <span style={{ fontSize:9,color:catInfo(item.cat).color }}>{catInfo(item.cat).icon} {catInfo(item.cat).label}</span>
                  {item.priority==="高"&&<span style={{ fontSize:8,color:"#CC4444" }}>高优</span>}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div style={{ textAlign:"center", padding:"16px 0", color:T.textDim, fontSize:12 }}>
            {week[selectedDay] && selectedDay > week.findIndex(d=>d.today) ? "未来计划待添加" : "当日暂无任务"}
          </div>
        )}
      </div>

      {/* Category bars */}
      <SectionLabel T={T}>分类进展</SectionLabel>
      <div style={{ background:T.surface,border:`1px solid ${T.border}`,borderRadius:12,padding:"14px",marginBottom:14 }}>
        {CATS.map((c,i)=>{
          const all=items.filter(x=>x.cat===c.id), d=all.filter(x=>x.done), noted=all.filter(x=>x.agentNote).length;
          const p=all.length?d.length/all.length:0;
          return (
            <div key={c.id} style={{ marginBottom:i<CATS.length-1?12:0 }}>
              <div style={{ display:"flex",justifyContent:"space-between",marginBottom:4 }}>
                <div style={{ fontSize:11,color:c.color,display:"flex",gap:5,alignItems:"center" }}><span>{c.icon}</span><span>{c.label}</span></div>
                <div style={{ fontSize:10,color:T.textDim,fontFamily:"monospace",display:"flex",gap:8 }}>
                  {noted>0&&<span style={{ color:"#7A4AAA",fontSize:9 }}>🤖{noted}</span>}
                  <span>{d.length}/{all.length}</span>
                </div>
              </div>
              <div style={{ height:5,background:T.surface2,borderRadius:3,overflow:"hidden" }}>
                <div style={{ height:"100%",width:`${p*100}%`,background:`linear-gradient(90deg,${c.color}88,${c.color})`,borderRadius:3,transition:"width 1.2s ease" }}/>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── MONTH VIEW ─────────────────────────────────────────────────────────────────
function MonthView({ items, today, T }) {
  const [selectedDate, setSelectedDate] = useState(today.getDate());
  const year  = today.getFullYear();
  const month = today.getMonth();

  const firstDay   = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth= new Date(year, month+1, 0).getDate();

  // Adjust for Mon-first grid
  const startOffset = (firstDay + 6) % 7;

  // Simulate completion data per day (use deadline field)
  const getDataForDay = (d) => {
    const dateStr = `${year}-${String(month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
    const dayItems = items.filter(i => i.deadline === dateStr);
    const done     = dayItems.filter(i=>i.done).length;
    // Simulate some past days having data
    const pastSimulated = d < today.getDate() && dayItems.length === 0
      ? { total: Math.floor(Math.random()*5)+1, done: Math.floor(Math.random()*5)+1 }
      : null;
    const total = pastSimulated ? pastSimulated.total : dayItems.length;
    const doneCount = pastSimulated ? Math.min(pastSimulated.done, total) : done;
    return { total, done:doneCount, items:dayItems };
  };

  const getRatioColor = (ratio, isFuture, isToday, T) => {
    if (isFuture)    return T.surface2;
    if (ratio >= 1)  return "#3A8A5A";
    if (ratio >= 0.6)return "#6AAA6A";
    if (ratio >= 0.3)return "#D4920A";
    if (ratio > 0)   return "#CC6644";
    return T.surface;
  };

  const selData  = getDataForDay(selectedDate);
  const monthName= today.toLocaleDateString("zh-CN",{year:"numeric",month:"long"});
  const WEEKDAYS = ["一","二","三","四","五","六","日"];

  const cells = [];
  for (let i=0; i<startOffset; i++) cells.push(null);
  for (let d=1; d<=daysInMonth; d++) cells.push(d);

  return (
    <div>
      {/* Month header */}
      <div style={{ textAlign:"center", fontSize:13, fontWeight:700, color:T.text, marginBottom:12 }}>{monthName}</div>

      {/* Weekday headers */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:3, marginBottom:4 }}>
        {WEEKDAYS.map(w=>(
          <div key={w} style={{ textAlign:"center", fontSize:9, color:T.textDim, padding:"2px 0" }}>{w}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:3, marginBottom:14 }}>
        {cells.map((d,i)=>{
          if (!d) return <div key={`e${i}`}/>;
          const isToday  = d === today.getDate();
          const isFuture = d > today.getDate();
          const isSel    = d === selectedDate;
          const { total, done } = getDataForDay(d);
          const ratio    = total > 0 ? done/total : -1;
          const bg       = ratio >= 0 ? getRatioColor(ratio, isFuture, isToday, T) : T.surface;

          // Deadline items on this day
          const dateStr = `${year}-${String(month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
          const hasDeadline = items.some(i=>i.deadline===dateStr&&!i.done);

          return (
            <div key={d} onClick={()=>setSelectedDate(d)} style={{
              aspectRatio:"1", borderRadius:6, cursor:"pointer", position:"relative",
              background: bg,
              border:`2px solid ${isSel ? T.accent : isToday ? T.accent+"88" : "transparent"}`,
              display:"flex", alignItems:"center", justifyContent:"center",
              transition:"all 0.15s",
              opacity: isFuture && !hasDeadline ? 0.35 : 1,
            }}>
              <span style={{
                fontSize:10, fontFamily:"monospace",
                color: ratio>=0.6 && !isFuture ? "#FFF" : isToday ? T.accent : T.text,
                fontWeight: isToday ? 700 : 400,
              }}>{d}</span>
              {/* Deadline dot */}
              {hasDeadline && (
                <div style={{
                  position:"absolute", bottom:2, right:2,
                  width:4, height:4, borderRadius:"50%", background:"#CC4444",
                }}/>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div style={{ display:"flex", gap:10, justifyContent:"center", marginBottom:14, flexWrap:"wrap" }}>
        {[
          {bg:"#3A8A5A",l:"完成100%"},
          {bg:"#D4920A",l:"进行中"},
          {bg:"#CC4444",l:"截止预警"},
          {bg:T.surface2,l:"未来/无任务"},
        ].map(({bg,l})=>(
          <div key={l} style={{ display:"flex",alignItems:"center",gap:4 }}>
            <div style={{ width:10,height:10,borderRadius:2,background:bg,border:`1px solid ${T.border}` }}/>
            <span style={{ fontSize:9,color:T.textDim }}>{l}</span>
          </div>
        ))}
      </div>

      {/* Selected day detail */}
      <div style={{ background:T.surface,border:`1px solid ${T.border}`,borderRadius:12,padding:"14px" }}>
        <div style={{ fontSize:12,fontWeight:600,color:T.text,marginBottom:10 }}>
          {month+1}月{selectedDate}日
          {selectedDate === today.getDate() && <span style={{ fontSize:9,color:T.accent,marginLeft:6,border:`1px solid ${T.accent}`,padding:"1px 5px",borderRadius:4 }}>今天</span>}
        </div>
        {selData.items.length > 0 ? (
          selData.items.map(item=>(
            <div key={item.id} style={{
              display:"flex",gap:8,padding:"8px 10px",marginBottom:6,
              background:T.surface2,borderLeft:`3px solid ${catInfo(item.cat).color}`,borderRadius:6,
            }}>
              <div style={{ fontSize:12,color:item.done?T.textDim:T.text,flex:1,lineHeight:1.4 }}>{item.text}</div>
              <span style={{ fontSize:9,color:item.done?"#3A8A5A":"#CC4444",whiteSpace:"nowrap" }}>{item.done?"✓ 完成":"待完成"}</span>
            </div>
          ))
        ) : (
          <div style={{ textAlign:"center",padding:"12px 0",color:T.textDim,fontSize:12 }}>
            {selectedDate > today.getDate() ? "此日暂无截止任务" : "当日无记录"}
          </div>
        )}
      </div>
    </div>
  );
}

// ── MATRIX VIEW ────────────────────────────────────────────────────────────────
function MatrixView({ items, urgent, T }) {
  return (
    <div>
      {/* Priority matrix */}
      <SectionLabel T={T}>优先矩阵</SectionLabel>
      <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:14 }}>
        {[
          {label:"🔴 立即处理", sub:"高优先·未完成", border:"#CC4444", items:items.filter(i=>i.priority==="高"&&!i.done)},
          {label:"🟡 计划执行", sub:"中优先·未完成", border:"#D4920A", items:items.filter(i=>i.priority==="中"&&!i.done)},
          {label:"🔵 可以推迟", sub:"低优先·未完成", border:"#4A7AAA", items:items.filter(i=>i.priority==="低"&&!i.done)},
          {label:"✅ 已完成",   sub:"本日完成",       border:"#3A8A5A", items:items.filter(i=>i.done)},
        ].map(q=>(
          <div key={q.label} style={{
            background:T.surface, border:`1px solid ${T.border}`,
            borderTop:`3px solid ${q.border}`,
            borderRadius:10, padding:"10px 12px", minHeight:110,
          }}>
            <div style={{ fontSize:11,fontWeight:600,color:T.text,marginBottom:2 }}>{q.label}</div>
            <div style={{ fontSize:8,color:T.textDim,marginBottom:8 }}>{q.sub} · {q.items.length}项</div>
            {q.items.slice(0,3).map(i=>(
              <div key={i.id} style={{
                fontSize:10,color:T.textMuted,marginBottom:4,lineHeight:1.4,
                paddingLeft:8, borderLeft:`2px solid ${catInfo(i.cat).color}`,
              }}>
                {i.text.slice(0,22)}{i.text.length>22?"…":""}
              </div>
            ))}
            {q.items.length>3 && (
              <div style={{ fontSize:9,color:T.textDim,paddingLeft:8 }}>+{q.items.length-3} 更多</div>
            )}
          </div>
        ))}
      </div>

      {/* Deadline timeline */}
      {urgent.length>0 && (
        <>
          <SectionLabel T={T}>⏰ 截止时间线</SectionLabel>
          <div style={{ background:T.surface,border:`1px solid ${T.border}`,borderRadius:12,padding:"14px",marginBottom:14 }}>
            {urgent.sort((a,b)=>a.deadline.localeCompare(b.deadline)).map((item,i)=>{
              const c = catInfo(item.cat);
              const daysLeft = Math.ceil((new Date(item.deadline)-new Date())/(1000*60*60*24));
              const isUrgent = daysLeft <= 1;
              return (
                <div key={item.id} style={{ display:"flex",gap:12,marginBottom:i<urgent.length-1?12:0 }}>
                  {/* Timeline line */}
                  <div style={{ display:"flex",flexDirection:"column",alignItems:"center",flexShrink:0 }}>
                    <div style={{ width:10,height:10,borderRadius:"50%",background:isUrgent?"#CC4444":c.color,flexShrink:0 }}/>
                    {i<urgent.length-1 && <div style={{ width:1,flex:1,background:T.border,margin:"4px 0" }}/>}
                  </div>
                  <div style={{ flex:1,paddingBottom:i<urgent.length-1?8:0 }}>
                    <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:3 }}>
                      <span style={{ fontSize:10,color:isUrgent?"#CC4444":T.accent,fontFamily:"monospace",fontWeight:700 }}>
                        {item.deadline}
                      </span>
                      <span style={{ fontSize:9,color:isUrgent?"#CC4444":T.textDim }}>
                        {daysLeft<=0?"今天截止":daysLeft===1?"明天截止":`${daysLeft}天后`}
                      </span>
                    </div>
                    <div style={{ fontSize:12,color:T.text,lineHeight:1.4 }}>{item.text}</div>
                    <span style={{ fontSize:9,color:c.color }}>{c.icon} {c.label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ─── INSIGHT PAGE ─────────────────────────────────────────────────────────────
function InsightPage({ items, done, pct, T, aiConfig }) {
  const [report, setReport]       = useState(null);
  const [loading, setLoading]     = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryNote, setSummaryNote] = useState(null);
  const chatEndRef = useRef(null);

  useEffect(()=>{ chatEndRef.current?.scrollIntoView({behavior:"smooth"}); },[chatHistory]);

  const buildContext = () => {
    const pending=items.filter(i=>!i.done), urgentItems=items.filter(i=>i.deadline&&!i.done);
    const notedItems=items.filter(i=>i.agentNote);
    return `
【今日数据 ${new Date().toLocaleDateString("zh-CN")}】
总记录:${items.length} | 完成:${done.length} | 完成率:${pct}%
高优未完成:${items.filter(i=>i.priority==="高"&&!i.done).length} | 截止预警:${urgentItems.length}
Agent已分析:${notedItems.length}条

未完成任务:
${pending.map(i=>`[${i.priority}][${catInfo(i.cat).label}] ${i.text}${i.deadline?" 截止:"+i.deadline:""}`).join("\n")}

已完成:
${done.map(i=>`[${catInfo(i.cat).label}] ${i.text}`).join("\n")}

Agent批注摘要:
${notedItems.slice(0,3).map(i=>`- ${catInfo(i.cat).label}「${i.text.slice(0,15)}…」→ ${i.agentNote?.text?.slice(0,40)}…`).join("\n")}
    `.trim();
  };

  const generateReport = async () => {
    setLoading(true); setReport(null);
    try {
      const text = await callAI({
        modelId: aiConfig.modelId, apiKey: aiConfig.apiKey,
        maxTokens: 600,
        system:`你是个人效能教练。分析用户数据，给出今日复盘报告。
输出格式（严格）：
### 🔍 状态诊断
（2-3句话，基于数据说实话）
### ⚠ 关键风险
（1-2个最重要的风险，具体）
### 🎯 明日建议
（3条，每条一句话，用•开头，可执行）
总计控制在200字内，不废话。`,
        userContent:`基于以下数据生成今日复盘：\n${buildContext()}`,
      });
      setReport(text);
    } catch(e){ setReport(`❌ ${e.message}`); }
    finally{ setLoading(false); }
  };

  const callSummaryAgent = async () => {
    setSummaryLoading(true); setSummaryNote(null);
    try {
      const text = await callAI({
        modelId: aiConfig.modelId, apiKey: aiConfig.apiKey,
        maxTokens: 400,
        system: SUMMARY_AGENT.system,
        userContent:`请分析以下用户数据：\n${buildContext()}`,
      });
      setSummaryNote(text);
    } catch(e){ setSummaryNote(`❌ ${e.message}`); }
    finally{ setSummaryLoading(false); }
  };

  const sendChat = async () => {
    if(!chatInput.trim()||chatLoading) return;
    const msg=chatInput.trim(); setChatInput("");
    const newH=[...chatHistory,{role:"user",content:msg}];
    setChatHistory(newH); setChatLoading(true);
    try {
      // For multi-turn chat we build a combined userContent with history
      const historyText = newH.slice(0,-1).map(m=>`${m.role==="user"?"用户":"AI"}: ${m.content}`).join("\n");
      const userContent = historyText ? `对话历史：\n${historyText}\n\n用户最新问题：${msg}` : msg;
      const reply = await callAI({
        modelId: aiConfig.modelId, apiKey: aiConfig.apiKey,
        maxTokens: 300,
        system:`你是用户的个人效能助手，熟悉其今日数据。数据：\n${buildContext()}\n\n简洁回答，控制150字内。`,
        userContent,
      });
      setChatHistory(prev=>[...prev,{role:"assistant",content:reply}]);
    } catch(e){ setChatHistory(prev=>[...prev,{role:"assistant",content:`❌ ${e.message}`}]); }
    finally{ setChatLoading(false); }
  };

  const parseReport=(text)=>{
    if(!text) return [];
    return text.split("###").filter(Boolean).map(s=>{
      const lines=s.trim().split("\n"), title=lines[0].trim(), body=lines.slice(1).join("\n").trim();
      return {title,body};
    });
  };

  const sections=parseReport(report);
  const sectionColors=[T.accent,"#CC5555","#3A8A5A"];

  return (
    <div>
      {/* Score */}
      <div style={{ background:T.surface,border:`1px solid ${T.border}`,borderRadius:14,padding:"18px",marginBottom:14,textAlign:"center" }}>
        <div style={{ fontSize:48,fontWeight:700,color:T.accent,fontFamily:"monospace",lineHeight:1 }}>{pct}<span style={{fontSize:20}}>%</span></div>
        <div style={{ fontSize:11,color:T.textDim,letterSpacing:2,marginTop:6 }}>本日综合完成率</div>
        <div style={{ display:"flex",justifyContent:"center",gap:24,marginTop:14 }}>
          {[
            {v:done.length,l:"已完成"},
            {v:items.filter(i=>!i.done).length,l:"待完成"},
            {v:items.filter(i=>i.agentNote).length,l:"Agent批注"},
          ].map(s=>(
            <div key={s.l}>
              <div style={{ fontSize:18,fontWeight:700,color:T.textMuted,fontFamily:"monospace" }}>{s.v}</div>
              <div style={{ fontSize:9,color:T.textDim,marginTop:2 }}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Summary Agent */}
      <SectionLabel T={T}>🔄 汇总Agent · 跨类别分析</SectionLabel>
      {!summaryNote&&!summaryLoading&&(
        <button onClick={callSummaryAgent} style={{
          width:"100%",padding:"12px",marginBottom:14,
          background:"transparent",border:`1px dashed ${T.border2}`,
          borderRadius:10,fontSize:12,color:T.textMuted,
          cursor:"pointer",fontFamily:"inherit",
        }}>
          召唤汇总Agent，发现跨类别规律 →
        </button>
      )}
      {summaryLoading&&(
        <div style={{ textAlign:"center",padding:"16px",marginBottom:14,background:T.surface,border:`1px solid ${T.border}`,borderRadius:10 }}>
          <Spinner color="#7A4AAA"/><div style={{ fontSize:11,color:T.textDim,marginTop:8 }}>汇总Agent分析中…</div>
        </div>
      )}
      {summaryNote&&(
        <div style={{ background:T.surface,border:`1px solid #7A4AAA33`,borderLeft:"3px solid #7A4AAA",borderRadius:10,padding:"14px",marginBottom:14,animation:"popIn 0.3s ease" }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
            <div style={{ width:22,height:22,borderRadius:"50%",background:"#7A4AAA22",border:"1px solid #7A4AAA40",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12 }}>🔄</div>
            <span style={{ fontSize:11,color:"#7A4AAA",fontWeight:600 }}>全局观察者</span>
            <span style={{ fontSize:9,color:T.textDim }}>· 跨类别分析</span>
          </div>
          {parseReport(summaryNote).map((sec,i)=>(
            <div key={i} style={{ marginBottom:i<2?12:0 }}>
              <div style={{ fontSize:11,fontWeight:700,color:"#7A4AAA",marginBottom:5 }}>{sec.title}</div>
              <div style={{ fontSize:12.5,color:T.textMuted,lineHeight:1.8,whiteSpace:"pre-wrap" }}>{sec.body}</div>
            </div>
          ))}
          <button onClick={()=>setSummaryNote(null)} style={{ fontSize:9,color:T.textDim,background:"none",border:"none",cursor:"pointer",marginTop:10 }}>✕ 清除</button>
        </div>
      )}

      {/* Daily report */}
      <SectionLabel T={T}>AI · 今日复盘</SectionLabel>
      {!report&&!loading&&(
        <div style={{ background:T.surface,border:`1px solid ${T.border}`,borderRadius:12,padding:"20px",textAlign:"center",marginBottom:14 }}>
          <div style={{ fontSize:28,marginBottom:8 }}>📋</div>
          <div style={{ fontSize:12,color:T.textMuted,marginBottom:14,lineHeight:1.7 }}>基于真实数据生成专属复盘</div>
          <button onClick={generateReport} style={{ padding:"9px 24px",background:T.accent,color:"#000",border:"none",borderRadius:8,fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit" }}>生成复盘 →</button>
        </div>
      )}
      {loading&&(
        <div style={{ textAlign:"center",padding:"24px",marginBottom:14,background:T.surface,border:`1px solid ${T.border}`,borderRadius:12 }}>
          <Spinner color={T.accent}/><div style={{ fontSize:11,color:T.textDim,marginTop:10 }}>分析中…</div>
        </div>
      )}
      {report&&!loading&&(
        <div style={{ marginBottom:14,animation:"popIn 0.4s ease" }}>
          {sections.length>0?sections.map((sec,i)=>(
            <div key={i} style={{ background:T.surface,border:`1px solid ${T.border}`,borderLeft:`3px solid ${sectionColors[i]||T.accent}`,borderRadius:10,padding:"12px 14px",marginBottom:8 }}>
              <div style={{ fontSize:11,fontWeight:700,color:sectionColors[i]||T.accent,marginBottom:6 }}>{sec.title}</div>
              <div style={{ fontSize:12,color:T.textMuted,lineHeight:1.8,whiteSpace:"pre-wrap" }}
                dangerouslySetInnerHTML={{__html:sec.body.replace(/\*\*(.*?)\*\*/g,"<strong>$1</strong>").replace(/•/g,`<span style="color:${T.accent}">•</span>`)}}
              />
            </div>
          )):(
            <div style={{ background:T.surface,border:`1px solid ${T.border}`,borderRadius:10,padding:"14px",fontSize:12,color:T.textMuted,lineHeight:1.8 }}>{report}</div>
          )}
          <button onClick={generateReport} style={{ width:"100%",padding:"7px",background:"transparent",border:`1px dashed ${T.border2}`,borderRadius:8,fontSize:11,color:T.textDim,cursor:"pointer",fontFamily:"inherit",marginTop:4 }}>↻ 重新生成</button>
        </div>
      )}

      {/* Chat */}
      <SectionLabel T={T} style={{marginTop:6}}>与 AI 对话</SectionLabel>
      <div style={{ background:T.surface,border:`1px solid ${T.border}`,borderRadius:12,padding:"14px",marginBottom:14 }}>
        {chatHistory.length===0&&(
          <div style={{ display:"flex",flexWrap:"wrap",gap:6,marginBottom:12 }}>
            {["今天哪件事最值得优先处理？","我的灵感和哪个任务可以联动？","帮我规划明天的时间","哪里可以改进？"].map(q=>(
              <button key={q} onClick={()=>setChatInput(q)} style={{ padding:"5px 10px",background:T.surface2,border:`1px solid ${T.border}`,borderRadius:16,fontSize:10,color:T.textMuted,cursor:"pointer",fontFamily:"inherit" }}>{q}</button>
            ))}
          </div>
        )}
        {chatHistory.length>0&&(
          <div style={{ maxHeight:260,overflowY:"auto",marginBottom:10 }}>
            {chatHistory.map((msg,i)=>(
              <div key={i} style={{ display:"flex",justifyContent:msg.role==="user"?"flex-end":"flex-start",marginBottom:8 }}>
                <div style={{
                  maxWidth:"85%",padding:"8px 12px",borderRadius:10,
                  background:msg.role==="user"?T.accent+"22":T.surface2,
                  border:`1px solid ${msg.role==="user"?T.accent+"44":T.border}`,
                  fontSize:12,color:T.text,lineHeight:1.6,
                  borderBottomRightRadius:msg.role==="user"?2:10,
                  borderBottomLeftRadius:msg.role==="user"?10:2,
                }}>
                  {msg.role==="assistant"&&<div style={{ fontSize:9,color:T.accent,marginBottom:3,letterSpacing:2 }}>AI ·</div>}
                  <div style={{ whiteSpace:"pre-wrap" }}>{msg.content}</div>
                </div>
              </div>
            ))}
            {chatLoading&&<div style={{ display:"flex",gap:4,padding:"8px 12px" }}>{[0,1,2].map(i=><div key={i} style={{ width:6,height:6,borderRadius:"50%",background:T.textDim,animation:`pulse 1.2s ease ${i*0.2}s infinite` }}/>)}</div>}
            <div ref={chatEndRef}/>
          </div>
        )}
        <div style={{ display:"flex",gap:8 }}>
          <input value={chatInput} onChange={e=>setChatInput(e.target.value)}
            onKeyDown={e=>{ if(e.key==="Enter") sendChat(); }}
            placeholder="问任何关于今天的问题…"
            style={{ flex:1,background:T.surface2,border:`1px solid ${T.border2}`,borderRadius:8,padding:"9px 12px",color:T.text,fontSize:12,fontFamily:"inherit",outline:"none" }}
          />
          <button onClick={sendChat} disabled={chatLoading} style={{ padding:"9px 14px",background:chatLoading?T.surface2:T.accent,color:"#000",border:"none",borderRadius:8,fontSize:12,cursor:"pointer",fontFamily:"inherit",fontWeight:700 }}>→</button>
        </div>
      </div>
    </div>
  );
}

// ─── CAPTURE DRAWER ───────────────────────────────────────────────────────────
function CaptureDrawer({ onClose, onAdd, T }) {
  const [text,setText]       = useState("");
  const [selCat,setSelCat]   = useState("spark");
  const [priority,setPriority] = useState("中");
  const [deadline,setDeadline] = useState("");
  const ref=useRef(null);
  useEffect(()=>{ ref.current?.focus(); },[]);
  const submit=()=>{ if(!text.trim()) return; onAdd({cat:selCat,text:text.trim(),priority,deadline}); onClose(); };
  return (
    <div style={{ position:"fixed",inset:0,zIndex:200,display:"flex",flexDirection:"column",justifyContent:"flex-end" }}>
      <div onClick={onClose} style={{ position:"absolute",inset:0,background:"rgba(0,0,0,0.6)",backdropFilter:"blur(4px)" }}/>
      <div style={{ position:"relative",background:T.surface,borderTop:`1px solid ${T.border}`,borderRadius:"16px 16px 0 0",padding:"20px 20px 36px",animation:"slideUp 0.3s ease" }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16 }}>
          <div style={{ fontSize:10,letterSpacing:4,color:T.textDim }}>快速捕获</div>
          <button onClick={onClose} style={{ background:"none",border:"none",color:T.textDim,fontSize:18,cursor:"pointer" }}>✕</button>
        </div>
        <textarea ref={ref} value={text} onChange={e=>setText(e.target.value)}
          placeholder="任何想法、任务、资讯…"
          onKeyDown={e=>{ if(e.key==="Enter"&&(e.metaKey||e.ctrlKey)) submit(); }}
          style={{ width:"100%",background:T.surface2,border:`1px solid ${T.border2}`,borderRadius:10,padding:"12px 14px",color:T.text,fontSize:14,resize:"none",height:88,fontFamily:"inherit",outline:"none",lineHeight:1.6 }}
        />
        <div style={{ display:"flex",gap:6,marginTop:12,flexWrap:"wrap" }}>
          {CATS.map(c=><Pill key={c.id} active={selCat===c.id} color={c.color} T={T} onClick={()=>setSelCat(c.id)}>{c.icon} {c.label}</Pill>)}
        </div>
        <div style={{ display:"flex",gap:8,marginTop:10,alignItems:"center" }}>
          {["高","中","低"].map(p=>(
            <button key={p} onClick={()=>setPriority(p)} style={{ padding:"4px 12px",borderRadius:16,cursor:"pointer",background:priority===p?T.accent+"22":"transparent",border:`1px solid ${priority===p?T.accent:T.border2}`,color:priority===p?T.accent:T.textMuted,fontSize:11,fontFamily:"inherit" }}>{p}</button>
          ))}
          <input type="date" value={deadline} onChange={e=>setDeadline(e.target.value)}
            style={{ flex:1,background:T.surface2,border:`1px solid ${T.border2}`,borderRadius:6,padding:"4px 8px",color:T.textMuted,fontSize:11,fontFamily:"inherit",outline:"none" }}
          />
        </div>
        <button onClick={submit} style={{ width:"100%",marginTop:14,padding:"12px",background:T.accent,color:"#000",border:"none",borderRadius:10,fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"inherit" }}>记录 ⌘↵</button>
      </div>
    </div>
  );
}

// ─── SETTINGS PANEL ──────────────────────────────────────────────────────────
function SettingsPanel({ T, modelId, apiKeys, onModelChange, onApiKeyChange, onClose }) {
  const [localKeys, setLocalKeys] = useState({...apiKeys});
  const [saved, setSaved]         = useState(false);
  const [testing, setTesting]     = useState(false);
  const [testResult, setTestResult] = useState(null); // null | {ok, msg}

  const handleSave = () => {
    Object.entries(localKeys).forEach(([id, key]) => onApiKeyChange(id, key));
    setSaved(true);
    setTestResult(null);
    setTimeout(()=>{ setSaved(false); onClose(); }, 900);
  };

  const handleTest = async () => {
    const m = MODELS.find(x=>x.id===modelId);
    const key = localKeys[modelId] || apiKeys[modelId] || "";
    if (!key.trim()) {
      setTestResult({ ok:false, msg:"请先填入 API Key" });
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const reply = await callAI({
        modelId, apiKey: key,
        system:  "你是助手，请用中文简短回复。",
        userContent: "请回复「连接成功」三个字",
        maxTokens: 20,
      });
      const ok = reply.length > 0;
      setTestResult({ ok, msg: ok ? `✅ 连接成功：${reply.slice(0,20)}` : "❌ 返回内容为空" });
    } catch(e) {
      setTestResult({ ok:false, msg:`❌ ${e.message}` });
    } finally {
      setTesting(false);
    }
  };

  const currentM = MODELS.find(x=>x.id===modelId);

  return (
    <div style={{ position:"fixed",inset:0,zIndex:300,display:"flex",flexDirection:"column",justifyContent:"flex-end" }}>
      <div onClick={onClose} style={{ position:"absolute",inset:0,background:"rgba(0,0,0,0.5)",backdropFilter:"blur(4px)" }}/>
      <div style={{
        position:"relative", background:T.surface,
        borderTop:`1px solid ${T.border}`, borderRadius:"18px 18px 0 0",
        padding:"20px 20px 36px", animation:"slideUp 0.3s ease",
        maxHeight:"88vh", overflowY:"auto",
      }}>
        {/* Header */}
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18 }}>
          <div>
            <div style={{ fontSize:14,fontWeight:700,color:T.text }}>AI 模型设置</div>
            <div style={{ fontSize:10,color:T.textDim,marginTop:2 }}>选择模型 · 填入 Key · 测试连接</div>
          </div>
          <button onClick={onClose} style={{ background:"none",border:"none",color:T.textDim,fontSize:18,cursor:"pointer" }}>✕</button>
        </div>

        {/* GLM quick guide — shown prominently if GLM selected */}
        {modelId==="glm-4-flash" && (
          <div style={{
            background:"#3A8A5A12", border:"1px solid #3A8A5A44",
            borderRadius:10, padding:"12px 14px", marginBottom:16,
          }}>
            <div style={{ fontSize:11,fontWeight:600,color:"#3A8A5A",marginBottom:8 }}>🚀 GLM-4 Flash 快速上手</div>
            <div style={{ fontSize:11,color:T.textMuted,lineHeight:1.9 }}>
              1. 打开 <span style={{ color:T.accent,fontFamily:"monospace" }}>open.bigmodel.cn</span> 注册登录<br/>
              2. 顶部菜单 → <strong>API Keys</strong> → 新建 Key<br/>
              3. 复制 Key 粘贴到下方输入框<br/>
              4. 点「测试连接」确认是否通畅
            </div>
          </div>
        )}

        {/* Model selector */}
        <div style={{ fontSize:9,letterSpacing:3,color:T.textDim,marginBottom:10 }}>选择模型</div>
        <div style={{ display:"flex",flexDirection:"column",gap:6,marginBottom:18 }}>
          {MODELS.map(m=>{
            const isActive = m.id===modelId;
            const hasKey   = !!(localKeys[m.id]||apiKeys[m.id]);
            return (
              <div key={m.id} onClick={()=>{ onModelChange(m.id); setTestResult(null); }} style={{
                padding:"10px 14px", borderRadius:10, cursor:"pointer",
                background:isActive?T.accent+"12":T.surface2,
                border:`1px solid ${isActive?T.accent:T.border}`,
                transition:"all 0.2s",
              }}>
                <div style={{ display:"flex",alignItems:"center",gap:10 }}>
                  <div style={{
                    width:14,height:14,borderRadius:"50%",flexShrink:0,
                    border:`2px solid ${isActive?T.accent:T.border2}`,
                    background:isActive?T.accent:"transparent",
                  }}/>
                  <div style={{ flex:1 }}>
                    <div style={{ display:"flex",alignItems:"center",gap:6,flexWrap:"wrap" }}>
                      <span style={{ fontSize:12,fontWeight:isActive?700:400,color:isActive?T.accent:T.text }}>{m.label}</span>
                      {m.free&&<span style={{ fontSize:8,color:"#3A8A5A",border:"1px solid #3A8A5A44",padding:"1px 5px",borderRadius:4 }}>免费</span>}
                    </div>
                    <div style={{ fontSize:9,color:T.textDim,marginTop:1 }}>{m.region}</div>
                  </div>
                  {hasKey&&<span style={{ fontSize:10,color:"#3A8A5A" }}>✓ 已配置</span>}
                </div>
              </div>
            );
          })}
        </div>

        {/* Key input for current model only (cleaner) */}
        <div style={{ fontSize:9,letterSpacing:3,color:T.textDim,marginBottom:10 }}>
          {currentM?.label} · API Key
        </div>
        <div style={{ position:"relative", marginBottom:10 }}>
          <input
            type="password"
            value={localKeys[modelId]||""}
            onChange={e=>{ setLocalKeys(prev=>({...prev,[modelId]:e.target.value})); setTestResult(null); }}
            placeholder={currentM?.keyPlaceholder||"填入 API Key"}
            style={{
              width:"100%", background:T.surface2, border:`1px solid ${T.border2}`,
              borderRadius:8, padding:"10px 12px", color:T.text,
              fontSize:12, fontFamily:"monospace", outline:"none",
              boxSizing:"border-box",
            }}
          />
        </div>

        {/* Note for current model */}
        {currentM?.note && (
          <div style={{ fontSize:10,color:T.textDim,marginBottom:12,paddingLeft:4 }}>
            ℹ️ {currentM.note}
          </div>
        )}

        {/* Test result */}
        {testResult && (
          <div style={{
            padding:"10px 14px", borderRadius:8, marginBottom:12,
            background:testResult.ok?"#3A8A5A14":"#CC444414",
            border:`1px solid ${testResult.ok?"#3A8A5A44":"#CC444444"}`,
            fontSize:12, color:testResult.ok?"#3A8A5A":"#CC4444",
          }}>
            {testResult.msg}
          </div>
        )}

        {/* Test + Save buttons */}
        <div style={{ display:"flex",gap:8,marginBottom:16 }}>
          <button onClick={handleTest} disabled={testing} style={{
            flex:1, padding:"10px",
            background:"transparent",
            border:`1px solid ${T.border2}`,
            borderRadius:8, fontSize:12, color:T.textMuted,
            cursor:testing?"wait":"pointer", fontFamily:"inherit",
            display:"flex",alignItems:"center",justifyContent:"center",gap:6,
          }}>
            {testing ? <><Spinner color={T.textDim}/> 测试中…</> : "🔌 测试连接"}
          </button>
          <button onClick={handleSave} style={{
            flex:2, padding:"10px",
            background:saved?"#3A8A5A":T.accent,
            color:"#000", border:"none", borderRadius:8,
            fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit",
            transition:"background 0.3s",
          }}>
            {saved?"✓ 已保存，关闭中…":"保存并关闭"}
          </button>
        </div>

        {/* Where to get keys — collapsed secondary info */}
        <details style={{ cursor:"pointer" }}>
          <summary style={{ fontSize:10,color:T.textDim,listStyle:"none",display:"flex",alignItems:"center",gap:4 }}>
            <span>🔑</span><span>所有平台 API Key 获取地址</span>
          </summary>
          <div style={{ background:T.surface2,border:`1px solid ${T.border}`,borderRadius:10,padding:"12px 14px",marginTop:8,fontSize:11,color:T.textDim,lineHeight:2 }}>
            {[
              ["GLM","open.bigmodel.cn → API Keys"],
              ["DeepSeek","platform.deepseek.com → API Keys"],
              ["Kimi","platform.moonshot.cn → API Keys"],
              ["Gemini","aistudio.google.com → Get API Key"],
              ["Claude","console.anthropic.com → API Keys"],
            ].map(([name,url])=>(
              <div key={name} style={{ display:"flex",gap:8 }}>
                <span style={{ color:T.textDim,width:56,flexShrink:0 }}>{name}:</span>
                <span style={{ color:T.accent,fontSize:10,wordBreak:"break-all" }}>{url}</span>
              </div>
            ))}
          </div>
        </details>
      </div>
    </div>
  );
}

// ─── SHARED ───────────────────────────────────────────────────────────────────
function RingProgress({ pct, T }) {
  const r=20, circ=2*Math.PI*r;
  return (
    <div style={{ position:"relative",width:48,height:48 }}>
      <svg width="48" height="48" style={{ transform:"rotate(-90deg)" }}>
        <circle cx="24" cy="24" r={r} fill="none" stroke={T.border} strokeWidth="3"/>
        <circle cx="24" cy="24" r={r} fill="none" stroke={T.accent} strokeWidth="3"
          strokeDasharray={circ} strokeDashoffset={circ*(1-pct/100)}
          strokeLinecap="round" style={{ transition:"stroke-dashoffset 1s ease" }}
        />
      </svg>
      <div style={{ position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:T.accent,fontFamily:"monospace" }}>{pct}%</div>
    </div>
  );
}

function Spinner({ color }) {
  return <div style={{ width:14,height:14,borderRadius:"50%",border:`2px solid ${color}33`,borderTopColor:color,animation:"spin 0.7s linear infinite" }}/>;
}

function Pill({ active, color, onClick, children, T }) {
  return (
    <button onClick={onClick} style={{
      padding:"4px 12px", borderRadius:16, cursor:"pointer",
      background:active?color+"22":"transparent",
      border:`1px solid ${active?color:T.border}`,
      color:active?color:T.textMuted,
      fontSize:11, whiteSpace:"nowrap", fontFamily:"inherit", transition:"all 0.2s",
    }}>{children}</button>
  );
}

function ModeBtn({ active, onClick, color, children, T }) {
  return (
    <button onClick={onClick} style={{
      padding:"3px 10px", borderRadius:12, cursor:"pointer",
      background:active?color+"22":"transparent",
      border:`1px solid ${active?color:T.border2}`,
      color:active?color:T.textDim,
      fontSize:10, fontFamily:"inherit",
    }}>{children}</button>
  );
}

function SectionLabel({ children, T, style={} }) {
  return <div style={{ fontSize:9,letterSpacing:3,color:T.textDim,marginBottom:8,marginTop:4,...style }}>{children}</div>;
}
