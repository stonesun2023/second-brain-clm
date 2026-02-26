import { useState, useEffect } from 'react';
import { useArchive } from '../hooks/useStorage.js';
import { useCats } from '../store/useItems.js';
import { Pill, SectionLabel } from './shared/index.jsx';
import { catInfo } from '../utils/data.js';

export default function ArchivePage({ T }) {
  const { archive, restoreArchive, clearArchive } = useArchive();
  const [cats] = useCats();
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [archiveList, setArchiveList] = useState(archive);
  
  // 监听归档更新事件，刷新归档列表
  useEffect(() => {
    const handleArchiveUpdate = (e) => {
      setArchiveList(e.detail);
    };
    window.addEventListener('archive-updated', handleArchiveUpdate);
    return () => window.removeEventListener('archive-updated', handleArchiveUpdate);
  }, []);
  
  // 当 useArchive 的 archive 更新时，同步更新本地状态
  useEffect(() => {
    setArchiveList(archive);
  }, [archive]);
  
  const filtered = archiveList.filter(item => {
    const matchesCat = filter === "all" || item.cat === filter;
    const matchesQuery = !query || item.text.toLowerCase().includes(query.toLowerCase());
    return matchesCat && matchesQuery;
  });

  const handleRestore = async (id) => {
    try {
      const restoredItem = await restoreArchive(id);
      if (restoredItem) {
        // 通知父组件刷新主列表
        window.dispatchEvent(new CustomEvent('archive-restored', { detail: restoredItem }));
      }
    } catch (e) {
      console.warn("Failed to restore archive:", e);
    }
  };

  return (
    <div>
      {/* Search */}
      <div style={{ marginBottom:10 }}>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="搜索归档内容…"
          style={{
            width:"100%", background:T.surface2, border:`1px solid ${T.border2}`,
            borderRadius:8, padding:"10px 12px", color:T.text, fontSize:13,
            fontFamily:"inherit", outline:"none",
          }}
        />
      </div>

      {/* Category filter */}
      <div style={{ display:"flex", gap:6, overflowX:"auto", paddingBottom:6, marginBottom:12 }}>
        <Pill active={filter==="all"} color={T.accent} T={T} onClick={()=>setFilter("all")}>全部</Pill>
        {cats.map(c=><Pill key={c.id} active={filter===c.id} color={c.color} T={T} onClick={()=>setFilter(c.id)}>{c.icon}</Pill>)}
      </div>

      {/* Clear archive button */}
      {archive.length > 0 && (
        <div style={{ marginBottom:12, textAlign:"center" }}>
          <button
            onClick={() => {
              if (window.confirm("确认清空所有归档？")) {
                clearArchive();
              }
            }}
            style={{
              padding:"6px 12px", borderRadius:16,
              background: T.surface, border:`1px solid ${T.border}`,
              cursor:"pointer", fontSize:10, color:T.textMuted,
              fontFamily:"inherit",
            }}
          >
            清空归档
          </button>
        </div>
      )}

      {/* Archive list */}
      {filtered.length > 0 ? (
        <>
          <SectionLabel T={T}>归档记录 · {filtered.length}</SectionLabel>
          {filtered.map(item => (
            <div key={item.id} style={{
              marginBottom:8, padding:"10px 12px", background:T.surface,
              border:`1px solid ${T.border}`, borderRadius:8,
            }}>
              <div style={{ display:"flex", gap:10, alignItems:"center" }}>
                <div style={{ fontSize:16 }}>{catInfo(item.cat).icon}</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, color:T.text, lineHeight:1.5, wordBreak:"break-all" }}>
                    {item.text}
                  </div>
                  <div style={{ display:"flex", gap:8, marginTop:4, alignItems:"center", flexWrap:"wrap" }}>
                    <span style={{ fontSize:9, color:catInfo(item.cat).color }}>{catInfo(item.cat).icon} {catInfo(item.cat).label}</span>
                    {item.priority==="高" && <span style={{ fontSize:8,color:"#CC4444",border:"1px solid #CC444430",padding:"1px 4px",borderRadius:3 }}>高优</span>}
                    {item.deadline && <span style={{ fontSize:9,color:T.textDim }}>⏰{item.deadline}</span>}
                    <span style={{ fontSize:9,color:T.textDim,marginLeft:"auto" }}>{item.time}</span>
                  </div>
                  <div style={{ fontSize:9, color:T.textDim, marginTop:4 }}>
                    归档于 {new Date(item.archivedAt).toLocaleString("zh-CN")}
                  </div>
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:4, flexShrink:0, alignItems:"center" }}>
                  <button
                    onClick={() => handleRestore(item.id)}
                    title="恢复"
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
                    🔄
                  </button>
                </div>
              </div>
            </div>
          ))}
        </>
      ) : (
        <div style={{ textAlign:"center", color:T.textDim, padding:"40px 0" }}>
          暂无归档记录
        </div>
      )}
    </div>
  );
}