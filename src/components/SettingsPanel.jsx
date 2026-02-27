import { useState, useEffect } from 'react';
import { MODELS, callAI } from '../utils/ai.js';
import { useCats } from '../store/useItems.js';
import { Spinner } from './shared/index.jsx';
import { AGENTS, loadAgents, saveAgents, DEFAULT_AGENTS_EXPORT } from '../utils/agents.js';

export default function SettingsPanel({ T, modelId, apiKeys, onModelChange, onApiKeyChange, onClose }) {
  const [localKeys, setLocalKeys] = useState({...apiKeys});
  const [saved, setSaved]         = useState(false);
  const [testing, setTesting]     = useState(false);
  const [testResult, setTestResult] = useState(null); // null | {ok, msg}
  const [cats, updateCats] = useCats();
  const [newCatName, setNewCatName] = useState("");
  const [newCatIcon, setNewCatIcon] = useState("🏷️");
  const [newCatColor, setNewCatColor] = useState("#3B82F6");

  const handleAddCat = () => {
    if (!newCatName.trim() || !newCatIcon.trim()) return;
    const newCat = {
      id: newCatName.trim().toLowerCase().replace(/\s+/g, "-"),
      label: newCatName.trim(),
      icon: newCatIcon.trim(),
      color: newCatColor,
    };
    updateCats([...cats, newCat]);
    setNewCatName("");
    setNewCatIcon("🏷️");
    setNewCatColor("#3B82F6");
  };

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

  // Agent 人设管理
  const [agents, setAgents] = useState(loadAgents());
  const [editingAgent, setEditingAgent] = useState(null);

  const handleAgentSave = (id, newSystem) => {
    const updated = { ...agents, [id]: { ...agents[id], system: newSystem } };
    setAgents(updated);
    saveAgents(updated);
  };

  const handleAgentReset = (id) => {
    const updated = { ...agents, [id]: { ...DEFAULT_AGENTS_EXPORT[id] } };
    setAgents(updated);
    saveAgents(updated);
  };

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

        {/* 类目管理 */}
        <div style={{ marginTop:18, paddingTop:14, borderTop:`1px solid ${T.border2}` }}>
          <div style={{ fontSize:14,fontWeight:700,color:T.text,marginBottom:8 }}>类目管理</div>
          <div style={{ fontSize:10,color:T.textDim,marginBottom:12 }}>管理你的分类标签：添加、删除、修改颜色和图标</div>
          
          {/* 当前类目列表 */}
          <div style={{ display:"flex",flexDirection:"column",gap:8,marginBottom:12 }}>
            {cats.map((cat, index) => (
              <div key={cat.id} style={{
                display:"flex",alignItems:"center",gap:10,
                padding:"8px 12px", borderRadius:8,
                background:T.surface2, border:`1px solid ${T.border2}`,
              }}>
                <div style={{ fontSize:16 }}>{cat.icon}</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:12,fontWeight:600,color:T.text }}>{cat.label}</div>
                  <div style={{ fontSize:10,color:T.textDim }}>{cat.id}</div>
                </div>
                <div style={{ width:20,height:20,borderRadius:"50%",background:cat.color,border:"1px solid #0002" }}/>
                <button onClick={() => {
                  const newCats = cats.filter((_, i) => i !== index);
                  updateCats(newCats);
                }} style={{
                  padding:"4px 8px", borderRadius:6, border:`1px solid ${T.border2}`,
                  background:"transparent", color:T.textDim, fontSize:11, cursor:"pointer",
                }}>删除</button>
              </div>
            ))}
          </div>

          {/* 添加新类目 */}
          <div style={{ display:"flex",gap:8,alignItems:"center",marginBottom:8 }}>
            <input
              type="text"
              placeholder="新类目名称"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              style={{
                flex:1, padding:"8px 10px", borderRadius:8,
                background:T.surface2, border:`1px solid ${T.border2}`,
                color:T.text, fontSize:12, outline:"none",
              }}
            />
            <input
              type="text"
              placeholder="图标"
              value={newCatIcon}
              onChange={(e) => setNewCatIcon(e.target.value)}
              style={{
                width:60, padding:"8px 10px", borderRadius:8,
                background:T.surface2, border:`1px solid ${T.border2}`,
                color:T.text, fontSize:12, outline:"none", textAlign:"center",
              }}
            />
            <input
              type="color"
              value={newCatColor}
              onChange={(e) => setNewCatColor(e.target.value)}
              style={{ width:40, height:32, borderRadius:6, border:"none", cursor:"pointer" }}
            />
            <button onClick={handleAddCat} disabled={!newCatName.trim() || !newCatIcon.trim()} style={{
              padding:"8px 12px", borderRadius:8, border:"none",
              background:T.accent, color:"#000", fontSize:12, fontWeight:600, cursor:"pointer",
              opacity: (!newCatName.trim() || !newCatIcon.trim()) ? 0.5 : 1,
            }}>添加</button>
          </div>
        </div>

        {/* Agent 人设管理 */}
        <div style={{ marginTop:18, paddingTop:14, borderTop:`1px solid ${T.border2}` }}>
          <div style={{ fontSize:14,fontWeight:700,color:T.text,marginBottom:8 }}>Agent 人设</div>
          <div style={{ fontSize:10,color:T.textDim,marginBottom:12 }}>自定义每个 Agent 的回复风格和提示词</div>
          
          {/* Agent 列表 */}
          <div style={{ display:"flex",flexDirection:"column",gap:8,marginBottom:12 }}>
            {Object.entries(agents).map(([id, agent]) => (
              <div key={id} style={{
                display:"flex",alignItems:"center",gap:10,
                padding:"8px 12px", borderRadius:8,
                background:T.surface2, border:`1px solid ${T.border2}`,
              }}>
                <div style={{ fontSize:16 }}>{agent.avatar}</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:12,fontWeight:600,color:T.text }}>{agent.name}</div>
                  <div style={{ fontSize:10,color:T.textDim }}>{agent.greeting}</div>
                </div>
                <button onClick={() => setEditingAgent(editingAgent === id ? null : id)} style={{
                  padding:"4px 8px", borderRadius:6, border:`1px solid ${T.border2}`,
                  background:"transparent", color:T.textDim, fontSize:11, cursor:"pointer",
                }}>{editingAgent === id ? "收起" : "编辑"}</button>
              </div>
            ))}
          </div>

          {/* 编辑区域 */}
          {editingAgent && (
            <div style={{
              background:T.surface2, border:`1px solid ${T.border2}`,
              borderRadius:10, padding:"12px 14px", marginBottom:12,
            }}>
              <div style={{ fontSize:12,fontWeight:600,color:T.text,marginBottom:8 }}>
                编辑 {agents[editingAgent].name} 的 system prompt
              </div>
              <textarea
                value={agents[editingAgent].system}
                onChange={(e) => setAgents({ ...agents, [editingAgent]: { ...agents[editingAgent], system: e.target.value } })}
                style={{
                  width:"100%", background:T.surface, border:`1px solid ${T.border}`,
                  borderRadius:8, padding:"10px 12px", color:T.text,
                  fontSize:12, fontFamily:"inherit", outline:"none",
                  minHeight:120, resize:"vertical",
                }}
              />
              <div style={{ display:"flex",gap:8,marginTop:10 }}>
                <button onClick={() => {
                  handleAgentSave(editingAgent, agents[editingAgent].system);
                  setEditingAgent(null);
                }} style={{
                  padding:"8px 12px", borderRadius:8, border:"none",
                  background:T.accent, color:"#000", fontSize:12, fontWeight:600, cursor:"pointer",
                }}>保存</button>
                <button onClick={() => handleAgentReset(editingAgent)} style={{
                  padding:"8px 12px", borderRadius:8, border:`1px solid ${T.border2}`,
                  background:"transparent", color:T.textDim, fontSize:12, cursor:"pointer",
                }}>重置默认</button>
                <button onClick={() => setEditingAgent(null)} style={{
                  padding:"8px 12px", borderRadius:8, border:`1px solid ${T.border2}`,
                  background:"transparent", color:T.textDim, fontSize:12, cursor:"pointer",
                }}>取消</button>
              </div>
            </div>
          )}
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

