import { useState } from 'react';

export function RingProgress({ pct, T }) {
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

export function Spinner({ color }) {
  return <div style={{ width:14,height:14,borderRadius:"50%",border:`2px solid ${color}33`,borderTopColor:color,animation:"spin 0.7s linear infinite" }}/>;
}

export function Pill({ active, color, onClick, children, T }) {
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

export function ModeBtn({ active, onClick, color, children, T }) {
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

export function SectionLabel({ children, T, style={} }) {
  return <div style={{ fontSize:9,letterSpacing:3,color:T.textDim,marginBottom:8,marginTop:4,...style }}>{children}</div>;
}