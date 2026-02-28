import { useState, useRef, useCallback, useEffect } from 'react';

export function useSpeech() {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [supported, setSupported] = useState(false);
  
  const recognitionRef = useRef(null);
  const isManualStopRef = useRef(false);
  const listeningRef = useRef(false);

  const start = useCallback(() => {
    if (!recognitionRef.current) return;
    listeningRef.current = true;
    setListening(true);
    try { recognitionRef.current.start(); } catch(e) {}
  }, []);

  const stop = useCallback(() => {
    if (!recognitionRef.current) return;
    listeningRef.current = false;
    isManualStopRef.current = true;
    setListening(false);
    recognitionRef.current.stop();
  }, []);

  // 初始化 SpeechRecognition
  const initRecognition = useCallback(() => {
    if (typeof window === 'undefined') return;
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSupported(false);
      return;
    }

    setSupported(true);
    recognitionRef.current = new SpeechRecognition();
    const rec = recognitionRef.current;
    
    rec.lang = 'zh-CN';
    rec.continuous = false;
    rec.interimResults = false;
    
    rec.onresult = (event) => {
      let final = '';
      for (let i = 0; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          final += event.results[i][0].transcript;
        }
      }
      if (final) {
        setTranscript(prev => prev + final);
      }
    };

    rec.onend = () => {
      if (isManualStopRef.current) {
        isManualStopRef.current = false;
        setListening(false);
        setTimeout(() => { initRecognition(); }, 100);
        return;
      }
      // 非手动停止：累积 transcript 并自动重启
      if (listeningRef.current) {
        setTimeout(() => {
          if (recognitionRef.current) {
            try { recognitionRef.current.start(); } catch(e) {}
          }
        }, 100);
      }
    };

    rec.onerror = (event) => {
      console.warn('Speech recognition error:', event.error);
      setListening(false);
    };
  }, []);

  // 组件挂载时初始化
  useEffect(() => {
    initRecognition();
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript('');
  }, []);

  return {
    listening,
    transcript,
    start,
    stop,
    supported,
    resetTranscript,
  };
}