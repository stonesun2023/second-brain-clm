import { useState, useRef, useCallback, useEffect } from 'react';

export function useSpeech() {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [supported, setSupported] = useState(false);
  
  const recognitionRef = useRef(null);

  const start = useCallback(() => {
    if (!recognitionRef.current) return;
    setTranscript('');
    setListening(true);
    recognitionRef.current.start();
  }, []);

  const stop = useCallback(() => {
    if (!recognitionRef.current) return;
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
    rec.continuous = true;
    rec.interimResults = true;
    
    rec.onresult = (event) => {
      let finalTranscript = '';
      let interimTranscript = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcriptPart = result[0].transcript;
        
        if (result.isFinal) {
          finalTranscript += transcriptPart;
        } else {
          interimTranscript += transcriptPart;
        }
      }
      
      setTranscript(finalTranscript + interimTranscript);
    };

    rec.onend = () => {
      setListening(false);
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

  return {
    listening,
    transcript,
    start,
    stop,
    supported,
  };
}