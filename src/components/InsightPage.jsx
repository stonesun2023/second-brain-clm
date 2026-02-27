import { useState, useRef, useEffect } from 'react';
import { SUMMARY_AGENT, loadAgents } from '../utils/agents.js';
import { callAI } from '../utils/ai.js';
import { catInfo } from '../utils/data.js';
import { Spinner, SectionLabel } from './shared/index.jsx';

export default function InsightPage({ items, done, pct, T, aiConfig }) {
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

