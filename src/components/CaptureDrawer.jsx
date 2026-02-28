import React, { useState, useRef, useEffect } from 'react';
import { Pill } from './shared/index.jsx';
import { useCats } from '../store/useItems.js';
import { parseDateFromText } from '../utils/dateUtils.js';
import { useSpeech } from '../hooks/useSpeech.js';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          position:"fixed", inset:0, zIndex:200,
          display:"flex", alignItems:"center", justifyContent:"center",
          background:"rgba(0,0,0,0.6)"
        }}>
          <div style={{
            background:"#fff", borderRadius:16, padding:24,
            textAlign:"center", maxWidth:280
          }}>
            <div style={{fontSize:24, marginBottom:12}}>😅</div>
            <div style={{fontSize:14, marginBottom:16}}>加载失败，请重试</div>
            <button
              onClick={() => this.setState({ hasError: false })}
              style={{padding:"8px 24px", borderRadius:20, background:"#B8860B", color:"#000", border:"none", cursor:"pointer"}}
            >重试</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function CaptureDrawer({ onClose, onAdd, T, mode='text', initialPhoto=null }) {
  const [text,setText]       = useState("");
  const [selCat,setSelCat]   = useState(mode==='photo' ? 'photo' : 'spark');
  const [priority,setPriority] = useState("中");
  const [deadline,setDeadline] = useState("");
  const [timeHint,setTimeHint] = useState("");
  const [photo,setPhoto]     = useState(initialPhoto);
  const [attachImage,setAttachImage] = useState(null);
  const [recognizing,setRecognizing] = useState(false);
  const [cats] = useCats();
  const ref=useRef(null);
  const attachInputRef=useRef(null);
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

  // 图片压缩方法
  const compressImage = (file) => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        const maxWidth = 1024;
        const maxHeight = 1024;
        
        let width = img.width;
        let height = img.height;
        
        // 计算缩放比例
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        ctx.drawImage(img, 0, 0, width, height);
        const base64Data = canvas.toDataURL('image/jpeg', 0.85);
        resolve(base64Data);
      };
      
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  };

  // 处理附件图片
  const handleAttachImage = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    try {
      const base64Data = await compressImage(file);
      setAttachImage(base64Data);
      await handleRecognizeWithData(base64Data); // 直接传数据
    } catch (error) {
      console.error('图片压缩失败:', error);
      alert('图片处理失败，请重试');
    }
  };

  // 处理识别（接收 base64Data 参数）
  const handleRecognizeWithData = async (base64Data) => {
    if (!base64Data || recognizing) return;
    
    setRecognizing(true);
    
    const APIKEY_PRE = 'sb-apikey-v4-';
    const VISION_SYSTEM = "你是图片内容识别专家。判断图片类型并处理：书页/文章→OCR原文保留段落；白板/手写→提炼要点；名片→姓名/职位/公司/电话/邮箱；其他→描述内容提炼核心信息。只输出识别结果，不加解释。";
    
    const imageContent = [
      { type: "image", source: { type: "base64", media_type: "image/jpeg", data: base64Data.split(',')[1] } },
      { type: "text", text: "请识别这张图片的内容" }
    ];
    
    try {
      // 优先尝试 GLM-4V
      const glmKey = localStorage.getItem(`${APIKEY_PRE}glm-4-flash`) || '';
      if (glmKey) {
        try {
          const { callAI } = await import('../utils/ai.js');
          const result = await callAI({
            modelId: 'glm-4v-flash',
            apiKey: glmKey,
            system: VISION_SYSTEM,
            userContent: imageContent,
            maxTokens: 400
          });
          if (result) { setText(result); return; }
        } catch (e) {
          console.warn('GLM 识别失败，降级到 Gemini:', e.message);
        }
      }
      
      // 降级到 Gemini Flash
      const geminiKey = localStorage.getItem(`${APIKEY_PRE}gemini-flash`) || '';
      if (geminiKey) {
        const { callAI } = await import('../utils/ai.js');
        const result = await callAI({
          modelId: 'gemini-flash',
          apiKey: geminiKey,
          system: VISION_SYSTEM,
          userContent: imageContent,
          maxTokens: 400
        });
        setText(result || "");
        return;
      }
      
      // 两个都没有 Key
      alert("请先在设置中配置 GLM 或 Gemini 的 API Key");
      
    } catch (error) {
      console.error('识别失败:', error);
      alert("识别失败，请手动输入");
    } finally {
      setRecognizing(false);
    }
  };

  // 处理识别（保留原方法，调用 handleRecognizeWithData）
  const handleRecognize = async () => {
    if (!attachImage || recognizing) return;
    await handleRecognizeWithData(attachImage);
  };

  // 移除附件
  const handleRemoveAttach = () => {
    setAttachImage(null);
    if (attachInputRef.current) {
      attachInputRef.current.value = '';
    }
  };

  const submit=()=>{ 
    if(!text.trim()) return; 
    onAdd({cat:selCat,text:text.trim(),priority,deadline,photo:photo||attachImage||null}); 
    setPhoto(null); 
    setAttachImage(null); // 清空附件
    onClose(); 
  };
  return (
    <ErrorBoundary>
      <>
        <div style={{ position:"fixed",inset:0,zIndex:200,display:"flex",flexDirection:"column",justifyContent:"flex-end" }}>
          
          {/* 遮罩层：点击关闭，但不拦截内部点击 */}
          <div 
            onClick={onClose} 
            style={{ position:"absolute",inset:0,background:"rgba(0,0,0,0.6)",backdropFilter:"blur(4px)" }}
          />
          
          {/* 抽屉主体：position:relative 确保在遮罩层上方 */}
          <div style={{ position:"relative",zIndex:1,background:T.surface,borderTop:`1px solid ${T.border}`,borderRadius:"16px 16px 0 0",padding:"20px 20px 36px",animation:"slideUp 0.3s ease" }}>
            
            {/* 标题行 */}
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16 }}>
              <div style={{ fontSize:10,letterSpacing:4,color:T.textDim }}>快速捕获</div>
              <button onClick={onClose} style={{ background:"none",border:"none",color:T.textDim,fontSize:18,cursor:"pointer" }}>✕</button>
            </div>

            {/* 图片预览区 */}
            {attachImage && (
              <div style={{ position:"relative", width:"100%", height:72, marginBottom:8 }}>
                <img 
                  src={attachImage} 
                  alt="附件预览" 
                  style={{ 
                    width:72, height:72, borderRadius:8, objectFit:"cover",
                    border:`1px solid ${T.border2}`
                  }} 
                />
                <button
                  onClick={handleRemoveAttach}
                  style={{
                    position:"absolute", top:4, right:4, width:20, height:20,
                    borderRadius:"50%", background:"#CC4444", color:"#FFF",
                    border:"none", cursor:"pointer", fontSize:12,
                    display:"flex", alignItems:"center", justifyContent:"center"
                  }}
                >×</button>
                {recognizing && (
                  <div style={{
                    position:"absolute", inset:0, background:"rgba(0,0,0,0.5)",
                    borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center",
                    color:"#FFF", fontSize:14
                  }}>
                    🔍
                  </div>
                )}
              </div>
            )}

            {/* 文字输入区 */}
            <div style={{ position:"relative" }}>
              <textarea 
                ref={ref} 
                value={text} 
                onChange={e=>setText(e.target.value)}
                placeholder="任何想法、任务、资讯…"
                onKeyDown={e=>{ if(e.key==="Enter"&&(e.metaKey||e.ctrlKey)) submit(); }}
                style={{ width:"100%",background:T.surface2,border:`1px solid ${T.border2}`,borderRadius:10,padding:"12px 14px",color:T.text,fontSize:14,resize:"none",height:88,fontFamily:"inherit",outline:"none",lineHeight:1.6 }}
              />
              <button
                onClick={supported ? (listening ? stop : start) : undefined}
                disabled={!supported}
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

          {/* 照片预览 */}
          {mode==='photo' && photo && (
            <div style={{ position:'relative',width:'100%',height:180,marginTop:8,borderRadius:8,overflow:'hidden',border:`1px solid ${T.border}` }}>
              <img src={photo} alt="预览" style={{ width:'100%',height:'100%',objectFit:'cover' }} />
              <button
                onClick={() => setPhoto(null)}
                style={{ position:'absolute',top:8,right:8,width:24,height:24,borderRadius:'50%',background:'#CC4444',color:'#FFF',border:'none',cursor:'pointer',fontSize:12,display:'flex',alignItems:'center',justifyContent:'center' }}
              >×</button>
            </div>
          )}

          {/* 标签行 */}
          <div style={{ display:"flex",gap:6,marginTop:12,flexWrap:"wrap",alignItems:"center" }}>
            {cats.map(c=><Pill key={c.id} active={selCat===c.id} color={c.color} T={T} onClick={()=>setSelCat(c.id)}>{c.icon} {c.label}</Pill>)}
            
            {/* 隐藏的文件输入框 */}
            <input
              ref={attachInputRef}
              type="file"
              accept="image/*"
              style={{ display:"none" }}
              onChange={handleAttachImage}
            />
            
            {/* 附件按钮 */}
            <button
              onClick={() => attachInputRef.current?.click()}
              disabled={recognizing}
              style={{
                padding:"6px 12px", borderRadius:16, cursor:recognizing ? "not-allowed" : "pointer",
                background:recognizing ? T.border2 : T.surface2,
                border:`1px solid ${T.border2}`, color:recognizing ? T.textMuted : T.text,
                fontSize:11, fontFamily:"inherit", display:"flex", alignItems:"center", gap:6
              }}
            >
              {recognizing ? "🔍 识别中..." : "📎 附件"}
            </button>
          </div>

            {/* 优先级 + 日期 */}
            <div style={{ display:"flex",gap:8,marginTop:10,alignItems:"center" }}>
              {["高","中","低"].map(p=>(
                <button key={p} onClick={()=>setPriority(p)} style={{ padding:"4px 12px",borderRadius:16,cursor:"pointer",background:priority===p?T.accent+"22":"transparent",border:`1px solid ${priority===p?T.accent:T.border2}`,color:priority===p?T.accent:T.textMuted,fontSize:11,fontFamily:"inherit" }}>{p}</button>
              ))}
              <input type="date" value={deadline} onChange={e=>setDeadline(e.target.value)}
                style={{ flex:1,background:T.surface2,border:`1px solid ${T.border2}`,borderRadius:6,padding:"4px 8px",color:T.textMuted,fontSize:11,fontFamily:"inherit",outline:"none" }}
              />
            </div>

            {/* 时间提示 */}
            {timeHint && (
              <div style={{ fontSize:11,color:T.textDim,marginTop:6 }}>
                {timeHint}
              </div>
            )}

            {/* 提交按钮 */}
            <button onClick={submit} style={{ width:"100%",marginTop:14,padding:"12px",background:T.accent,color:"#000",border:"none",borderRadius:10,fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"inherit" }}>
              记录 ⌘↵
            </button>

          </div>
        </div>
      </>
    </ErrorBoundary>
  );
}

