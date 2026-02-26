import { useState } from 'react';
import { CATS, catInfo, WEEK } from '../utils/data.js';
import { SectionLabel } from './shared/index.jsx';

export default function BoardPage({ items, week, pct, urgent, T }) {
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
            const dayLabel = d.label.split("/")[1];
            const dayDate = `2026-02-${dayLabel.padStart(2,"0")}`;
            return dl === dayDate || dl.endsWith(`-${dayLabel.padStart(2,"0")}`);
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

function dark_or_light(T, darkVal, lightVal) {
  return T.bg.startsWith("#08") ? darkVal : lightVal;
}
